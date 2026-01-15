-- NexusCRM Database Schema
-- Version 1.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Table structure for table `users`
-- (Maps to TeamMember / CurrentUser)
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('Admin','Sales','Support','Manager') DEFAULT 'Sales',
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `avatar_initials` varchar(5) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `contacts`
-- (Maps to Contact)
--

CREATE TABLE `contacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `company` varchar(150) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'New', -- Maps to LeadStatus enum
  `source` varchar(50) DEFAULT NULL, -- Maps to Source enum
  `owner_id` int(11) DEFAULT NULL, -- Link to users table
  `value` decimal(15,2) DEFAULT '0.00',
  `currency` varchar(10) DEFAULT 'USD',
  `probability` int(3) DEFAULT '0',
  `lost_reason` varchar(255) DEFAULT NULL,
  `tags` text, -- JSON array of strings
  `bant_json` text DEFAULT NULL, -- JSON for budget, authority, need, timeline
  `documents_json` text DEFAULT NULL, -- JSON for attached documents
  `last_activity_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `contact_notes`
-- (Maps to Note)
--

CREATE TABLE `contact_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contact_id` int(11) NOT NULL,
  `author_id` int(11) DEFAULT NULL, -- Optional, if deleted user
  `content` text NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contact_id` (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `contact_history`
-- (Maps to Message/History)
--

CREATE TABLE `contact_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contact_id` int(11) NOT NULL,
  `sender` enum('agent','customer','system') NOT NULL,
  `type` enum('message','note') DEFAULT 'message',
  `channel` enum('whatsapp','email','internal') DEFAULT 'internal',
  `content` text,
  `subject` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contact_id` (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `tasks`
-- (Maps to Task)
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `type` enum('Call','Email','Meeting','Task') DEFAULT 'Task',
  `due_date` date DEFAULT NULL,
  `status` enum('Pending','Done') DEFAULT 'Pending',
  `priority` enum('High','Normal','Low') DEFAULT 'Normal',
  `assigned_to` int(11) DEFAULT NULL, -- User ID
  `related_contact_id` int(11) DEFAULT NULL, -- Contact ID
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `related_contact_id` (`related_contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `products`
-- (Maps to Product)
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text,
  `price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(10) DEFAULT 'USD',
  `category` varchar(50) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `status` enum('Active','Archived') DEFAULT 'Active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `automations`
-- (Maps to AutomationRule)
--

CREATE TABLE `automations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `category` varchar(50) DEFAULT 'CORE',
  `trigger_event` varchar(50) NOT NULL, -- e.g. ON_LEAD_CREATE
  `is_active` tinyint(1) DEFAULT '1',
  `config_json` text, -- JSON for extra params
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `email_templates`
--

CREATE TABLE `email_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `subject` varchar(200) NOT NULL,
  `body` text NOT NULL,
  `category` varchar(50) DEFAULT 'Sales',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `company_settings`
-- (Singleton table for CompanyProfile)
--

CREATE TABLE `company_settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `user_email_configs`
--

CREATE TABLE `user_email_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `smtp_host` varchar(255) NOT NULL,
  `smtp_port` int(5) NOT NULL DEFAULT '587',
  `smtp_user` varchar(255) NOT NULL,
  `smtp_pass` varchar(255) NOT NULL,
  `smtp_secure` enum('tls','ssl','none') DEFAULT 'tls',
  `from_name` varchar(100) DEFAULT NULL,
  `from_email` varchar(150) DEFAULT NULL,
  `signature` text DEFAULT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `quotes`
--

CREATE TABLE `quotes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quote_number` varchar(50) NOT NULL,
  `contact_id` int(11) NOT NULL,
  `items_json` text NOT NULL, -- JSON of products and quantities
  `total_amount` decimal(15,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `status` enum('Draft','Sent','Accepted','Rejected') DEFAULT 'Draft',
  `pdf_url` varchar(255) DEFAULT NULL,
  `created_by` int(11) NOT NULL, -- User ID
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contact_id` (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


--
-- Dumb Data (Initial Seed)
--

INSERT INTO `products` (`name`, `description`, `price`, `category`) VALUES 
('Plan Starter', 'Ideal para pymes', 29.00, 'Software'),
('Plan Pro', 'Usuarios ilimitados', 99.00, 'Software');

--
-- Table structure for table `pipeline_stages`
--

CREATE TABLE `pipeline_stages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `key_name` varchar(100) NOT NULL,
  `color` varchar(50) DEFAULT 'border-gray-500',
  `order_index` int(11) DEFAULT '0',
  `probability` int(3) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pipeline_stages`
--

INSERT INTO `pipeline_stages` (`name`, `key_name`, `color`, `order_index`, `probability`, `is_active`) VALUES
('Lead', 'lead', 'border-blue-500', 0, 10, 1),
('Contactado', 'contacted', 'border-yellow-500', 1, 30, 1),
('Reunión Programada', 'meeting_scheduled', 'border-purple-500', 2, 50, 1),
('Propuesta Enviada', 'proposal_sent', 'border-indigo-500', 3, 70, 1),
('Negociación', 'negotiation', 'border-orange-500', 4, 80, 1),
('Cerrado Ganado', 'closed_won', 'border-green-500', 5, 100, 1),
('Cerrado Perdido', 'closed_lost', 'border-red-500', 6, 0, 1);

--
-- Table structure for table `appointments`
--

CREATE TABLE IF NOT EXISTS `appointments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `contact_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contact_id` (`contact_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `notifications`
--

CREATE TABLE IF NOT EXISTS `notifications` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `type` enum('info', 'success', 'warning', 'error', 'urgent') DEFAULT 'info',
    `category` varchar(50) DEFAULT 'system', 
    `title` varchar(255) NOT NULL,
    `message` text,
    `is_read` tinyint(1) DEFAULT '0',
    `link_to` varchar(255) DEFAULT NULL,
    `metadata_json` text DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `user_id` (`user_id`),
    KEY `is_read` (`is_read`),
    KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `notification_preferences`
--

CREATE TABLE IF NOT EXISTS `notification_preferences` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `email_enabled` tinyint(1) DEFAULT '1',
    `browser_enabled` tinyint(1) DEFAULT '1',
    `urgent_only` tinyint(1) DEFAULT '0',
    `categories_muted` text DEFAULT NULL,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `automation_rules`
--

CREATE TABLE IF NOT EXISTS `automation_rules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `description` VARCHAR(255),
    `category` VARCHAR(50) DEFAULT 'CORE',
    `trigger_event` VARCHAR(50) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `config_json` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `audit_logs`
--

CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) DEFAULT NULL,
    `action` varchar(50) NOT NULL,
    `entity_type` varchar(50) NOT NULL,
    `entity_id` varchar(50) DEFAULT NULL,
    `details` text,
    `ip_address` varchar(45) DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `user_id` (`user_id`),
    KEY `action` (`action`),
    KEY `entity` (`entity_type`, `entity_id`),
    KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `api_stats`
--

CREATE TABLE IF NOT EXISTS `api_stats` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `endpoint` varchar(255) NOT NULL,
    `method` varchar(10) NOT NULL,
    `status_code` int(3) NOT NULL,
    `duration_ms` float NOT NULL,
    `user_id` int(11) DEFAULT NULL,
    `ip_address` varchar(45) DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `endpoint` (`endpoint`),
    KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
