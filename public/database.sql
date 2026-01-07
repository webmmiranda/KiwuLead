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
  `id` int(1) NOT NULL DEFAULT '1',
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text,
  PRIMARY KEY (`id`,`setting_key`)
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

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar_initials`) VALUES
(1, 'Soporte Admin', 'support@nexus.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Support', 'SP'),
(2, 'Gerente General', 'manager@nexus.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Manager', 'GG'),
(3, 'Vendedor Estrella', 'sales@nexus.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sales', 'VE'); 
-- Password is 'password' (bcrypt hash) para todos

INSERT INTO `products` (`name`, `description`, `price`, `category`) VALUES 
('Plan Starter', 'Ideal para pymes', 29.00, 'Software'),
('Plan Pro', 'Usuarios ilimitados', 99.00, 'Software');

COMMIT;
