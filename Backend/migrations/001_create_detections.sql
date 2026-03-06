-- Migration: Create detections table for caching

CREATE TABLE IF NOT EXISTS `detections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `file_hash` VARCHAR(128) NOT NULL,
  `is_deepfake` BOOLEAN,
  `prediction` VARCHAR(64),
  `confidence` INT,
  `heatmap_path` VARCHAR(255),
  `model_version` VARCHAR(64),
  `status` VARCHAR(20) DEFAULT 'processing',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `processed_at` DATETIME,
  UNIQUE KEY `uq_file_hash` (`file_hash`)
);
