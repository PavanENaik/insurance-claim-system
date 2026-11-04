USE insurance_claim_db;

SHOW TABLES;


SELECT * FROM users;

ALTER USER 'root'@'localhost'
IDENTIFIED BY 'Pesu@123';

FLUSH PRIVILEGES;

USE insurance_claim_db;

UPDATE claim_documents
SET
    verification_status = 'PENDING',
    verification_remarks = '',
    verified_at = NULL
WHERE document_id = 2;