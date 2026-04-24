ALTER TABLE drivers
ADD COLUMN ride_type ENUM('bike', 'standard', 'luxury', 'van') NOT NULL DEFAULT 'standard'
AFTER car_plate;

CREATE INDEX idx_drivers_ride_type ON drivers (ride_type);

UPDATE drivers
SET ride_type = 'luxury'
WHERE ride_type = 'xl';

UPDATE drivers
SET ride_type = 'standard'
WHERE ride_type IS NULL OR ride_type = '';
