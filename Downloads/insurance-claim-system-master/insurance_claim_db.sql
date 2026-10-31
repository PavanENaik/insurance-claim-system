-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: insurance_claim_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Temporary view structure for view `claim_details_view`
--

DROP TABLE IF EXISTS `claim_details_view`;
/*!50001 DROP VIEW IF EXISTS `claim_details_view`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `claim_details_view` AS SELECT 
 1 AS `claim_id`,
 1 AS `claim_number`,
 1 AS `policy_number`,
 1 AS `policy_type`,
 1 AS `incident_date`,
 1 AS `claim_amount`,
 1 AS `claim_status`,
 1 AS `claim_date`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `claim_documents`
--

DROP TABLE IF EXISTS `claim_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `claim_documents` (
  `document_id` int NOT NULL AUTO_INCREMENT,
  `claim_id` int NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `verification_status` enum('PENDING','VERIFIED','REJECTED') DEFAULT 'PENDING',
  `verification_remarks` text,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`document_id`),
  KEY `claim_id` (`claim_id`),
  CONSTRAINT `claim_documents_ibfk_1` FOREIGN KEY (`claim_id`) REFERENCES `claims` (`claim_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `claim_documents`
--

LOCK TABLES `claim_documents` WRITE;
/*!40000 ALTER TABLE `claim_documents` DISABLE KEYS */;
INSERT INTO `claim_documents` VALUES (1,1,'Medical Bill','hospital_bill.pdf','uploads/hospital_bill.pdf','VERIFIED','','2026-10-26 15:55:06','2026-10-29 03:43:18'),(2,1,'Test Document','test_rejection.pdf','uploads/test_rejection.pdf','REJECTED','Test rejection - document is incomplete','2026-10-29 03:52:09','2026-10-29 03:53:54');
/*!40000 ALTER TABLE `claim_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `claim_reviews`
--

DROP TABLE IF EXISTS `claim_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `claim_reviews` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `claim_id` int NOT NULL,
  `reviewer_id` int NOT NULL,
  `review_decision` enum('PENDING','APPROVED','REJECTED','NEEDS_MORE_INFO') DEFAULT 'PENDING',
  `remarks` text,
  `reviewed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  KEY `claim_id` (`claim_id`),
  KEY `reviewer_id` (`reviewer_id`),
  CONSTRAINT `claim_reviews_ibfk_1` FOREIGN KEY (`claim_id`) REFERENCES `claims` (`claim_id`),
  CONSTRAINT `claim_reviews_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `claim_reviews`
--

LOCK TABLES `claim_reviews` WRITE;
/*!40000 ALTER TABLE `claim_reviews` DISABLE KEYS */;
INSERT INTO `claim_reviews` VALUES (1,1,1,'APPROVED','Claim details checked and approved.','2026-10-28 16:32:51');
/*!40000 ALTER TABLE `claim_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `claim_status_history`
--

DROP TABLE IF EXISTS `claim_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `claim_status_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `claim_id` int NOT NULL,
  `old_status` varchar(30) DEFAULT NULL,
  `new_status` varchar(30) NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `claim_id` (`claim_id`),
  CONSTRAINT `claim_status_history_ibfk_1` FOREIGN KEY (`claim_id`) REFERENCES `claims` (`claim_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `claim_status_history`
--

LOCK TABLES `claim_status_history` WRITE;
/*!40000 ALTER TABLE `claim_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `claim_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `claims`
--

DROP TABLE IF EXISTS `claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `claims` (
  `claim_id` int NOT NULL AUTO_INCREMENT,
  `policy_id` int NOT NULL,
  `claim_number` varchar(50) NOT NULL,
  `incident_date` date NOT NULL,
  `claim_date` date NOT NULL,
  `claim_amount` decimal(12,2) NOT NULL,
  `claim_description` text,
  `claim_status` enum('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','SETTLED') DEFAULT 'SUBMITTED',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`claim_id`),
  UNIQUE KEY `claim_number` (`claim_number`),
  KEY `policy_id` (`policy_id`),
  KEY `idx_claim_status` (`claim_status`),
  KEY `idx_claim_date` (`claim_date`),
  CONSTRAINT `claims_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`policy_id`),
  CONSTRAINT `chk_claim_amount` CHECK ((`claim_amount` > 0)),
  CONSTRAINT `chk_claim_dates` CHECK ((`claim_date` >= `incident_date`))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `claims`
--

LOCK TABLES `claims` WRITE;
/*!40000 ALTER TABLE `claims` DISABLE KEYS */;
INSERT INTO `claims` VALUES (1,1,'CLM-TEST-001','2026-02-10','2026-02-12',25000.00,'Sample health insurance claim','APPROVED','2026-10-26 14:30:05'),(2,1,'CLM-2026-002','2026-02-10','2026-02-12',15000.00,'Medical expenses claim for hospital treatment','APPROVED','2026-10-26 15:53:32');
/*!40000 ALTER TABLE `claims` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `after_claim_status_update` AFTER UPDATE ON `claims` FOR EACH ROW BEGIN
    IF OLD.claim_status <> NEW.claim_status THEN
        INSERT INTO claim_status_history (
            claim_id,
            old_status,
            new_status
        )
        VALUES (
            NEW.claim_id,
            OLD.claim_status,
            NEW.claim_status
        );
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,1,'9876543210','Bengaluru, Karnataka','2026-10-26 14:27:26');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `insurance_policies`
--

DROP TABLE IF EXISTS `insurance_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `insurance_policies` (
  `policy_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `policy_number` varchar(50) NOT NULL,
  `policy_type` varchar(100) NOT NULL,
  `coverage_amount` decimal(12,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `policy_status` enum('ACTIVE','EXPIRED','CANCELLED') DEFAULT 'ACTIVE',
  PRIMARY KEY (`policy_id`),
  UNIQUE KEY `policy_number` (`policy_number`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `insurance_policies_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `chk_coverage_amount` CHECK ((`coverage_amount` > 0)),
  CONSTRAINT `chk_policy_dates` CHECK ((`end_date` >= `start_date`))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `insurance_policies`
--

LOCK TABLES `insurance_policies` WRITE;
/*!40000 ALTER TABLE `insurance_policies` DISABLE KEYS */;
INSERT INTO `insurance_policies` VALUES (1,1,'POL-TEST-001','Health',500000.00,'2026-01-01','2027-01-01','ACTIVE');
/*!40000 ALTER TABLE `insurance_policies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settlements`
--

DROP TABLE IF EXISTS `settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settlements` (
  `settlement_id` int NOT NULL AUTO_INCREMENT,
  `claim_id` int NOT NULL,
  `approved_amount` decimal(12,2) NOT NULL,
  `settlement_date` date DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_status` enum('PENDING','PROCESSING','PAID','FAILED') DEFAULT 'PENDING',
  `transaction_reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`settlement_id`),
  UNIQUE KEY `claim_id` (`claim_id`),
  UNIQUE KEY `transaction_reference` (`transaction_reference`),
  CONSTRAINT `settlements_ibfk_1` FOREIGN KEY (`claim_id`) REFERENCES `claims` (`claim_id`),
  CONSTRAINT `chk_approved_amount` CHECK ((`approved_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settlements`
--

LOCK TABLES `settlements` WRITE;
/*!40000 ALTER TABLE `settlements` DISABLE KEYS */;
INSERT INTO `settlements` VALUES (1,2,15000.00,'2026-10-28','BANK_TRANSFER','PROCESSING','TXN-TEST-001','2026-10-28 16:15:42');
/*!40000 ALTER TABLE `settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('ADMIN','CLAIM_OFFICER','CUSTOMER') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Test Customer','customer@example.com','$2b$12$6aK0wB0M8CFfereiIkaHC.ny5Z3fiQzLgjFK3HP39R/2LFlktzceW','CUSTOMER','2026-10-26 14:25:38');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'insurance_claim_db'
--

--
-- Dumping routines for database 'insurance_claim_db'
--
/*!50003 DROP PROCEDURE IF EXISTS `GetClaimsByStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetClaimsByStatus`(
    IN p_status VARCHAR(30)
)
BEGIN
    SELECT
        claim_id,
        claim_number,
        claim_amount,
        claim_status,
        claim_date
    FROM claims
    WHERE claim_status = p_status
    ORDER BY claim_date DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `claim_details_view`
--

/*!50001 DROP VIEW IF EXISTS `claim_details_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `claim_details_view` AS select `c`.`claim_id` AS `claim_id`,`c`.`claim_number` AS `claim_number`,`p`.`policy_number` AS `policy_number`,`p`.`policy_type` AS `policy_type`,`c`.`incident_date` AS `incident_date`,`c`.`claim_amount` AS `claim_amount`,`c`.`claim_status` AS `claim_status`,`c`.`claim_date` AS `claim_date` from (`claims` `c` join `insurance_policies` `p` on((`c`.`policy_id` = `p`.`policy_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-31 10:43:11
