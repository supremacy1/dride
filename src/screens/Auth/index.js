try {
  require('dotenv').config();
} catch (err) {
  console.warn('dotenv not found, continuing without loading .env file');
}

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./auth');
const driverRoutes = require('../Driver/driver');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, './public/uploads')));
app.use('/uploads', express.static(path.resolve(__dirname, './uploads')));

const rideSelectSql = `
  SELECT
    r.*,
    u.fullname AS rider_fullname,
    u.phone AS rider_phone,
    d.fullname AS driver_fullname,
    d.phone AS driver_phone,
    d.car_model,
    d.car_plate,
    d.current_lat,
    d.current_lng
  FROM rides r
  LEFT JOIN users u ON u.id = r.rider_id
  LEFT JOIN drivers d ON d.id = r.driver_id
  WHERE r.id = ?
  LIMIT 1
`;

const buildRideHistoryQuery = (role) => {
  const userColumn = role === 'driver' ? 'r.driver_id' : 'r.rider_id';

  return `
    SELECT
      r.id,
      r.rider_id,
      r.driver_id,
      r.pickup_address,
      r.destination_address,
      r.pickup_lat,
      r.pickup_lng,
      r.destination_lat,
      r.destination_lng,
      r.fare,
      r.distance,
      r.status,
      r.created_at,
      u.fullname AS rider_fullname,
      d.fullname AS driver_fullname,
      d.car_model,
      d.car_plate
    FROM rides r
    LEFT JOIN users u ON u.id = r.rider_id
    LEFT JOIN drivers d ON d.id = r.driver_id
    WHERE ${userColumn} = ?
    ORDER BY r.created_at DESC
  `;
};

const getRideById = async (rideId) => {
  const [rows] = await db.query(rideSelectSql, [rideId]);
  return rows[0] || null;
};

const emitRideHistoryUpdate = async (rideId) => {
  const ride = await getRideById(rideId);
  if (!ride) return;

  if (ride.rider_id) {
    io.to(`rider-${ride.rider_id}`).emit('rideUpdated', ride);
  }

  if (ride.driver_id) {
    io.to(`driver-${ride.driver_id}`).emit('rideUpdated', ride);
  }
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (payload) => {
    const userId =
      typeof payload === 'object' && payload !== null ? payload.userId : payload;
    const role =
      typeof payload === 'object' && payload !== null ? payload.role : 'rider';

    if (!userId) return;

    socket.join(`${role}-${String(userId)}`);
    if (role === 'driver') {
      socket.join('drivers');
    }

    console.log(
      `[Socket] ${role} ${userId} connected on socket ${socket.id}`
    );
  });

  socket.on('requestRide', async (rideData) => {
    try {
      const payload = [
        rideData.requestId,
        rideData.riderId,
        rideData.pickupAddress,
        rideData.destinationAddress,
        rideData.pickupCoords?.latitude ?? null,
        rideData.pickupCoords?.longitude ?? null,
        rideData.destinationCoords?.latitude ?? null,
        rideData.destinationCoords?.longitude ?? null,
        rideData.estimatedFare ?? 0,
        rideData.distance ?? 0,
      ];

      await db.query(
        `INSERT INTO rides (
          id,
          rider_id,
          pickup_address,
          destination_address,
          pickup_lat,
          pickup_lng,
          destination_lat,
          destination_lng,
          fare,
          distance,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ON DUPLICATE KEY UPDATE
          pickup_address = VALUES(pickup_address),
          destination_address = VALUES(destination_address),
          pickup_lat = VALUES(pickup_lat),
          pickup_lng = VALUES(pickup_lng),
          destination_lat = VALUES(destination_lat),
          destination_lng = VALUES(destination_lng),
          fare = VALUES(fare),
          distance = VALUES(distance),
          status = 'pending',
          driver_id = NULL`,
        payload
      );

      const ride = await getRideById(rideData.requestId);
      console.log(`[Socket] Ride requested by rider ${rideData.riderId}`);
      io.to('drivers').emit('newRideRequest', {
        ...rideData,
        riderPhone: ride?.rider_phone || null,
        riderName: ride?.rider_fullname || null,
        rider_phone: ride?.rider_phone || null,
        rider_fullname: ride?.rider_fullname || null,
      });
    } catch (error) {
      console.error('Ride request error:', error);
      io.to(`rider-${rideData.riderId}`).emit('rideRequestFailed', {
        requestId: rideData.requestId,
        message: 'Could not create ride request.',
      });
    }
  });

  socket.on('acceptRide', async (data) => {
    try {
      const [result] = await db.query(
        `UPDATE rides
         SET driver_id = ?, status = 'accepted'
         WHERE id = ? AND status = 'pending' AND driver_id IS NULL`,
        [data.driver?.id, data.requestId]
      );

      if (!result.affectedRows) {
        io.to(socket.id).emit('rideUnavailable', {
          requestId: data.requestId,
          message: 'Another driver already accepted this ride.',
        });
        return;
      }

      const ride = await getRideById(data.requestId);
      const riderRoom = `rider-${String(data.riderId).trim()}`;
      const acceptancePayload = {
        requestId: data.requestId || null,
        ride,
        driver: {
          ...data.driver,
          socketId: data.driverSocketId || socket.id,
          requestId: data.requestId || null,
          current_lat: ride?.current_lat ?? null,
          current_lng: ride?.current_lng ?? null,
        },
      };

      console.log(
        `[Socket] Driver ${data.driver?.fullname} (ID: ${data.driver?.id}) accepted ride ${data.requestId}`
      );

      io.to(riderRoom).emit('rideAccepted', acceptancePayload);
      io.to(`driver-${data.driver?.id}`).emit('rideAssigned', {
        requestId: data.requestId,
        ride,
      });
      io.to('drivers').emit('rideTaken', {
        requestId: data.requestId,
        driverId: data.driver?.id,
      });

      await emitRideHistoryUpdate(data.requestId);
    } catch (error) {
      console.error('Accept ride error:', error);
      io.to(socket.id).emit('rideUnavailable', {
        requestId: data.requestId,
        message: 'Could not accept this ride right now.',
      });
    }
  });

  socket.on('driverLocationUpdate', async (data) => {
    try {
      if (!data?.requestId || !data?.driverId) return;

      const [rows] = await db.query(
        `SELECT rider_id, driver_id, status
         FROM rides
         WHERE id = ? AND driver_id = ? LIMIT 1`,
        [data.requestId, data.driverId]
      );

      const ride = rows[0];
      if (!ride || ride.status === 'cancelled' || ride.status === 'completed') {
        return;
      }

      io.to(`rider-${ride.rider_id}`).emit('rideDriverLocation', {
        requestId: data.requestId,
        latitude: data.latitude,
        longitude: data.longitude,
      });
    } catch (error) {
      console.error('Driver location relay error:', error);
    }
  });

  socket.on('startRide', async (data) => {
    try {
      const ride = await getRideById(data.requestId);
      if (!ride || Number(ride.driver_id) !== Number(data.driverId)) {
        return;
      }

      io.to(`rider-${ride.rider_id}`).emit('tripStarted', {
        requestId: data.requestId,
        message: 'Your trip has started.',
      });
      io.to(`driver-${ride.driver_id}`).emit('tripStarted', {
        requestId: data.requestId,
        message: 'Trip started successfully.',
      });
    } catch (error) {
      console.error('Start ride error:', error);
    }
  });

  socket.on('completeRide', async (data) => {
    try {
      const [result] = await db.query(
        `UPDATE rides
         SET status = 'completed'
         WHERE id = ? AND driver_id = ? AND status IN ('accepted', 'pending')`,
        [data.requestId, data.driverId]
      );

      if (!result.affectedRows) {
        io.to(`driver-${data.driverId}`).emit('tripEndFailed', {
          requestId: data.requestId,
          message: 'Could not complete this trip in the database.',
        });
        return;
      }

      const ride = await getRideById(data.requestId);
      io.to(`rider-${ride.rider_id}`).emit('tripEnded', {
        requestId: data.requestId,
        fare: ride.fare,
        message: 'Trip completed successfully.',
      });
      io.to(`driver-${ride.driver_id}`).emit('tripEnded', {
        requestId: data.requestId,
        fare: ride.fare,
        message: 'Trip completed successfully.',
      });

      await emitRideHistoryUpdate(data.requestId);
    } catch (error) {
      console.error('Complete ride error:', error);
    }
  });

  socket.on('cancelRide', async (data) => {
    try {
      const [result] = await db.query(
        `UPDATE rides
         SET status = 'cancelled'
         WHERE id = ? AND rider_id = ? AND status IN ('pending', 'accepted')`,
        [data.requestId, data.riderId]
      );

      if (!result.affectedRows) return;

      const ride = await getRideById(data.requestId);
      const cancelPayload = {
        requestId: data.requestId || null,
        riderId: data.riderId || null,
        message: data.message || 'The rider cancelled this trip.',
      };

      if (ride?.driver_id) {
        io.to(`driver-${ride.driver_id}`).emit('rideCancelled', cancelPayload);
      }

      io.to(`rider-${data.riderId}`).emit('rideCancelled', cancelPayload);
      io.to('drivers').emit('rideTaken', {
        requestId: data.requestId,
        driverId: null,
        status: 'cancelled',
      });

      await emitRideHistoryUpdate(data.requestId);
    } catch (error) {
      console.error('Cancel ride error:', error);
    }
  });

  socket.on('driverCancelRide', async (data) => {
    try {
      const [result] = await db.query(
        `UPDATE rides
         SET status = 'cancelled'
         WHERE id = ? AND driver_id = ? AND status IN ('pending', 'accepted')`,
        [data.requestId, data.driverId]
      );

      if (!result.affectedRows) return;

      const ride = await getRideById(data.requestId);
      const cancelPayload = {
        requestId: data.requestId || null,
        driverId: data.driverId || null,
        message: data.message || 'The driver cancelled this ride.',
      };

      if (ride?.rider_id) {
        io.to(`rider-${ride.rider_id}`).emit('driverRideCancelled', cancelPayload);
      }

      if (ride?.driver_id) {
        io.to(`driver-${ride.driver_id}`).emit('rideCancelled', cancelPayload);
      }

      io.to('drivers').emit('rideTaken', {
        requestId: data.requestId,
        driverId: null,
        status: 'cancelled',
      });

      await emitRideHistoryUpdate(data.requestId);
    } catch (error) {
      console.error('Driver cancel ride error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);

app.post('/api/rides/request', async (req, res) => {
  const rideDetails = req.body;

  if (
    !rideDetails ||
    !rideDetails.id ||
    !rideDetails.riderId ||
    !rideDetails.pickupAddress ||
    !rideDetails.destinationAddress
  ) {
    return res.status(400).json({ message: 'Invalid ride request payload.' });
  }

  try {
    await db.query(
      `INSERT INTO rides (
        id,
        rider_id,
        pickup_address,
        destination_address,
        pickup_lat,
        pickup_lng,
        destination_lat,
        destination_lng,
        fare,
        distance,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        rideDetails.id,
        rideDetails.riderId,
        rideDetails.pickupAddress,
        rideDetails.destinationAddress,
        rideDetails.pickupCoords?.latitude ?? null,
        rideDetails.pickupCoords?.longitude ?? null,
        rideDetails.destinationCoords?.latitude ?? null,
        rideDetails.destinationCoords?.longitude ?? null,
        rideDetails.estimatedFare ?? 0,
        rideDetails.distance ?? 0,
      ]
    );

    return res.status(201).json({
      message: 'Ride request received.',
      rideId: rideDetails.id,
      status: 'pending',
    });
  } catch (error) {
    console.error('Create ride endpoint error:', error);
    return res.status(500).json({ message: 'Could not create ride.' });
  }
});

app.get('/api/rides/history', async (req, res) => {
  const { role, userId } = req.query;

  if (!role || !userId || !['rider', 'driver'].includes(String(role))) {
    return res.status(400).json({ message: 'role and userId are required.' });
  }

  try {
    const [rows] = await db.query(buildRideHistoryQuery(String(role)), [userId]);
    const history = rows.map((ride) => ({
      ...ride,
      payment_status:
        ride.status === 'completed'
          ? 'paid'
          : ride.status === 'cancelled'
            ? 'cancelled'
            : 'pending',
    }));

    return res.status(200).json(history);
  } catch (error) {
    console.error('Ride history error:', error);
    return res.status(500).json({ message: 'Could not fetch ride history.' });
  }
});

app.get('/', (req, res) => {
  res.send('EasyRide Server is running!');
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
