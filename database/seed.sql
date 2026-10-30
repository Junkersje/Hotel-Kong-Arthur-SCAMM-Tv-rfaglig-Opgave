-- =====================================================================
-- Hotel Kong Arthur — Seed Data
-- =====================================================================

USE hotel_kong_arthur;

-- 1. De 8 officielle værelsestyper
INSERT INTO room_types (id, name, description, capacity, base_price_dkk) VALUES
(1, 'Standard enkeltværelse', 'Kompakt og stilfuldt værelse ideelt til solo-rejsende.', 1, 1050.00),
(2, 'Grand lit værelse', 'Rummeligt enkeltværelse eller kompakt dobbeltværelse med ekstra komfort.', 2, 1250.00),
(3, 'Standard dobbeltværelse', 'Komfortabelt værelse velegnet til par eller forretningsrejsende.', 2, 1400.00),
(4, 'Superior dobbeltværelse', 'Rummeligere værelse med luksuriøse faciliteter og siddeområde.', 3, 1700.00),
(5, 'Junior suite', 'Unikke værelser, nogle med historisk inspiration, andre moderne minimalistiske.', 3, 2150.00),
(6, 'Spa executive', 'Suiter med eksklusiv wellness-atmosfære og fri adgang til Ni''mat spa.', 2, 2400.00),
(7, 'Suite', 'Store luksuriøse suiter med separate opholdsstuer og individuelle design.', 4, 3000.00),
(8, 'LOFT suite', 'Eksklusive suiter i to niveauer med panoramaudsigt over gårdhaverne.', 4, 3500.00);

-- 2. Alle 214 værelser på Hotel Kong Arthur (Etage 1-5)
-- Etage 1: 40 værelser (101-140)
INSERT INTO rooms (room_number, room_type_id, floor, is_active) VALUES
('101', 1, 1, 1), ('102', 1, 1, 1), ('103', 1, 1, 1), ('104', 1, 1, 1), ('105', 1, 1, 1),
('106', 1, 1, 1), ('107', 1, 1, 1), ('108', 1, 1, 1), ('109', 2, 1, 1), ('110', 2, 1, 1),
('111', 2, 1, 1), ('112', 2, 1, 1), ('113', 2, 1, 1), ('114', 2, 1, 1), ('115', 3, 1, 1),
('116', 3, 1, 1), ('117', 3, 1, 1), ('118', 3, 1, 1), ('119', 3, 1, 1), ('120', 3, 1, 1),
('121', 3, 1, 1), ('122', 3, 1, 1), ('123', 3, 1, 1), ('124', 3, 1, 1), ('125', 4, 1, 1),
('126', 4, 1, 1), ('127', 4, 1, 1), ('128', 4, 1, 1), ('129', 4, 1, 1), ('130', 4, 1, 1),
('131', 5, 1, 1), ('132', 5, 1, 1), ('133', 5, 1, 1), ('134', 6, 1, 1), ('135', 6, 1, 1),
('136', 6, 1, 1), ('137', 7, 1, 1), ('138', 7, 1, 1), ('139', 8, 1, 1), ('140', 8, 1, 1);

-- Etage 2: 45 værelser (201-245)
INSERT INTO rooms (room_number, room_type_id, floor, is_active) VALUES
('201', 1, 2, 1), ('202', 1, 2, 1), ('203', 1, 2, 1), ('204', 1, 2, 1), ('205', 1, 2, 1),
('206', 1, 2, 1), ('207', 2, 2, 1), ('208', 2, 2, 1), ('209', 2, 2, 1), ('210', 2, 2, 1),
('211', 2, 2, 1), ('212', 2, 2, 1), ('213', 2, 2, 1), ('214', 3, 2, 1), ('215', 3, 2, 1),
('216', 3, 2, 1), ('217', 3, 2, 1), ('218', 3, 2, 1), ('219', 3, 2, 1), ('220', 3, 2, 1),
('221', 3, 2, 1), ('222', 3, 2, 1), ('223', 3, 2, 1), ('224', 3, 2, 1), ('225', 3, 2, 1),
('226', 4, 2, 1), ('227', 4, 2, 1), ('228', 4, 2, 1), ('229', 4, 2, 1), ('230', 4, 2, 1),
('231', 4, 2, 1), ('232', 4, 2, 1), ('233', 5, 2, 1), ('234', 5, 2, 1), ('235', 5, 2, 1),
('236', 5, 2, 1), ('237', 6, 2, 1), ('238', 6, 2, 1), ('239', 6, 2, 1), ('240', 7, 2, 1),
('241', 7, 2, 1), ('242', 7, 2, 1), ('243', 8, 2, 1), ('244', 8, 2, 1), ('245', 8, 2, 1);

-- Etage 3: 45 værelser (301-345)
INSERT INTO rooms (room_number, room_type_id, floor, is_active) VALUES
('301', 1, 3, 1), ('302', 1, 3, 1), ('303', 1, 3, 1), ('304', 1, 3, 1), ('305', 1, 3, 1),
('306', 1, 3, 1), ('307', 2, 3, 1), ('308', 2, 3, 1), ('309', 2, 3, 1), ('310', 2, 3, 1),
('311', 2, 3, 1), ('312', 2, 3, 1), ('313', 3, 3, 1), ('314', 3, 3, 1), ('315', 3, 3, 1),
('316', 3, 3, 1), ('317', 3, 3, 1), ('318', 3, 3, 1), ('319', 3, 3, 1), ('320', 3, 3, 1),
('321', 3, 3, 1), ('322', 3, 3, 1), ('323', 3, 3, 1), ('324', 3, 3, 1), ('325', 4, 3, 1),
('326', 4, 3, 1), ('327', 4, 3, 1), ('328', 4, 3, 1), ('329', 4, 3, 1), ('330', 4, 3, 1),
('331', 4, 3, 1), ('332', 4, 3, 1), ('333', 5, 3, 1), ('334', 5, 3, 1), ('335', 5, 3, 1),
('336', 5, 3, 1), ('337', 6, 3, 1), ('338', 6, 3, 1), ('339', 6, 3, 1), ('340', 7, 3, 1),
('341', 7, 3, 1), ('342', 7, 3, 1), ('343', 8, 3, 1), ('344', 8, 3, 1), ('345', 8, 3, 1);

-- Etage 4: 45 værelser (401-445)
INSERT INTO rooms (room_number, room_type_id, floor, is_active) VALUES
('401', 1, 4, 1), ('402', 1, 4, 1), ('403', 1, 4, 1), ('404', 1, 4, 1), ('405', 2, 4, 1),
('406', 2, 4, 1), ('407', 2, 4, 1), ('408', 2, 4, 1), ('409', 2, 4, 1), ('410', 2, 4, 1),
('411', 3, 4, 1), ('412', 3, 4, 1), ('413', 3, 4, 1), ('414', 3, 4, 1), ('415', 3, 4, 1),
('416', 3, 4, 1), ('417', 3, 4, 1), ('418', 3, 4, 1), ('419', 3, 4, 1), ('420', 3, 4, 1),
('421', 3, 4, 1), ('422', 3, 4, 1), ('423', 4, 4, 1), ('424', 4, 4, 1), ('425', 4, 4, 1),
('426', 4, 4, 1), ('427', 4, 4, 1), ('428', 4, 4, 1), ('429', 4, 4, 1), ('430', 4, 4, 1),
('431', 5, 4, 1), ('432', 5, 4, 1), ('433', 5, 4, 1), ('434', 5, 4, 1), ('435', 6, 4, 1),
('436', 6, 4, 1), ('437', 6, 4, 1), ('438', 6, 4, 1), ('439', 7, 4, 1), ('440', 7, 4, 1),
('441', 7, 4, 1), ('442', 7, 4, 1), ('443', 8, 4, 1), ('444', 8, 4, 1), ('445', 8, 4, 1);

-- Etage 5: 39 værelser (501-539)
INSERT INTO rooms (room_number, room_type_id, floor, is_active) VALUES
('501', 1, 5, 1), ('502', 1, 5, 1), ('503', 1, 5, 1), ('504', 2, 5, 1), ('505', 2, 5, 1),
('506', 2, 5, 1), ('507', 3, 5, 1), ('508', 3, 5, 1), ('509', 3, 5, 1), ('510', 3, 5, 1),
('511', 3, 5, 1), ('512', 3, 5, 1), ('513', 3, 5, 1), ('514', 3, 5, 1), ('515', 3, 5, 1),
('516', 4, 5, 1), ('517', 4, 5, 1), ('518', 4, 5, 1), ('519', 4, 5, 1), ('520', 4, 5, 1),
('521', 4, 5, 1), ('522', 4, 5, 1), ('523', 5, 5, 1), ('524', 5, 5, 1), ('525', 5, 5, 1),
('526', 5, 5, 1), ('527', 6, 5, 1), ('528', 6, 5, 1), ('529', 6, 5, 1), ('530', 6, 5, 1),
('531', 7, 5, 1), ('532', 7, 5, 1), ('533', 7, 5, 1), ('534', 7, 5, 1), ('535', 8, 5, 1),
('536', 8, 5, 1), ('537', 8, 5, 1), ('538', 8, 5, 1), ('539', 8, 5, 1);

-- 3. Medarbejdere (Helene Christine i baren og receptionen)
INSERT INTO employees (id, employee_code, first_name, last_name, role) VALUES
(1, 'HC01', 'Helene Christine', 'Nielsen', 'Receptionist & Bartender'),
(2, 'MD01', 'Mads', 'Damsgaard', 'Bartender'),
(3, 'SL01', 'Sara', 'Lindberg', 'Receptionist');

-- 4. Produkter i Lobbybaren (Præcis 20 Cocktails og 10 Kaffetyper)
INSERT INTO products (id, name, category, unit_price_dkk) VALUES
-- 20 Cocktails
(1, 'Espresso Martini', 'cocktail', 125.00),
(2, 'Mojito', 'cocktail', 115.00),
(3, 'Old Fashioned', 'cocktail', 130.00),
(4, 'Negroni', 'cocktail', 120.00),
(5, 'Aperol Spritz', 'cocktail', 105.00),
(6, 'Gin & Tonic Nordisk', 'cocktail', 110.00),
(7, 'Cosmopolitan', 'cocktail', 115.00),
(8, 'Whiskey Sour', 'cocktail', 125.00),
(9, 'Dark and Stormy', 'cocktail', 115.00),
(10, 'Moscow Mule', 'cocktail', 115.00),
(11, 'Margarita', 'cocktail', 120.00),
(12, 'Dry Martini', 'cocktail', 125.00),
(13, 'French 75', 'cocktail', 135.00),
(14, 'Clover Club', 'cocktail', 120.00),
(15, 'Bramble', 'cocktail', 115.00),
(16, 'Arthurs Royal Herb', 'cocktail', 140.00),
(17, 'Copenhagen Sunset', 'cocktail', 130.00),
(18, 'Paloma', 'cocktail', 115.00),
(19, 'Daiquiri', 'cocktail', 110.00),
(20, 'Sidecar', 'cocktail', 125.00),
-- 10 Kaffetyper
(21, 'Espresso Single', 'coffee', 32.00),
(22, 'Espresso Double', 'coffee', 38.00),
(23, 'Americano', 'coffee', 42.00),
(24, 'Cafe Latte', 'coffee', 48.00),
(25, 'Cappuccino', 'coffee', 48.00),
(26, 'Flat White', 'coffee', 50.00),
(27, 'Cortado', 'coffee', 42.00),
(28, 'Iskaffe med Sirup', 'coffee', 55.00),
(29, 'Varm Chokolade med Flodeskum', 'coffee', 52.00),
(30, 'Stempelkaffe Kande', 'coffee', 65.00);

-- 5. Baseline Gæster fra forskellige lande
INSERT INTO guests (id, first_name, last_name, email, phone, country) VALUES
(1, 'Lars', 'Jensen', 'lars.jensen@example.dk', '+45 20112233', 'Danmark'),
(2, 'Emma', 'Svensson', 'emma.svensson@example.se', '+46 701234567', 'Sverige'),
(3, 'Hans', 'Müller', 'hans.mueller@example.de', '+49 1709876543', 'Tyskland'),
(4, 'James', 'Wilson', 'james.wilson@example.co.uk', '+44 7911123456', 'Storbritannien'),
(5, 'Sarah', 'Smith', 'sarah.smith@example.com', '+1 2025550198', 'USA'),
(6, 'Astrid', 'Nilsen', 'astrid.nilsen@example.no', '+47 91234567', 'Norge'),
(7, 'Jean', 'Dupont', 'jean.dupont@example.fr', '+33 612345678', 'Frankrig'),
(8, 'Marco', 'Rossi', 'marco.rossi@example.it', '+39 3401234567', 'Italien'),
(9, 'Anja', 'Vermeer', 'anja.vermeer@example.nl', '+31 612345678', 'Holland'),
(10, 'Wei', 'Zhang', 'wei.zhang@example.cn', '+86 13800138000', 'Kina'),
(11, 'Oliver', 'Hansen', 'oliver.hansen@example.dk', '+45 40506070', 'Danmark'),
(12, 'Freja', 'Madsen', 'freja.madsen@example.dk', '+45 50607080', NULL); -- Tester håndtering af 'Ukendt'

-- 6. Baseline Bookinger (Fordelt på Lav-, Mellem- og Højsæson)
INSERT INTO bookings (id, guest_id, room_id, check_in_date, check_out_date, num_guests, total_price_dkk, status, satisfaction_score) VALUES
-- Lavsæson 2026 (Januar/Februar)
(1, 1, 15, '2026-01-10', '2026-01-14', 2, 5600.00, 'checked_out', 5),
(2, 2, 25, '2026-01-15', '2026-01-18', 2, 5100.00, 'checked_out', 4),
(3, 3, 37, '2026-02-01', '2026-02-04', 3, 9000.00, 'checked_out', 5),
(4, 4, 1, '2026-02-10', '2026-02-12', 1, 2100.00, 'checked_out', 4),
(5, 5, 139, '2026-02-14', '2026-02-17', 2, 10500.00, 'checked_out', 5),
-- Mellemsæson 2026 (Marts/April/Maj)
(6, 6, 115, '2026-03-05', '2026-03-09', 2, 5600.00, 'checked_out', 4),
(7, 7, 125, '2026-03-12', '2026-03-15', 2, 5100.00, 'checked_out', 3),
(8, 8, 134, '2026-04-02', '2026-04-06', 2, 9600.00, 'checked_out', 5),
(9, 9, 214, '2026-04-10', '2026-04-13', 2, 4200.00, 'checked_out', 4),
(10, 10, 240, '2026-05-01', '2026-05-05', 3, 12000.00, 'checked_out', 5),
-- Højsæson 2026 (Juni/Juli/August)
(11, 1, 243, '2026-06-10', '2026-06-15', 2, 17500.00, 'checked_out', 5),
(12, 2, 314, '2026-06-18', '2026-06-22', 2, 5600.00, 'checked_out', 5),
(13, 3, 325, '2026-07-01', '2026-07-07', 3, 10200.00, 'checked_out', 4),
(14, 4, 337, '2026-07-10', '2026-07-14', 2, 9600.00, 'checked_out', 5),
(15, 5, 340, '2026-07-20', '2026-07-25', 4, 15000.00, 'checked_out', 5),
(16, 6, 343, '2026-08-01', '2026-08-06', 2, 17500.00, 'checked_out', 4),
(17, 7, 411, '2026-08-10', '2026-08-14', 2, 5600.00, 'checked_out', 3),
-- Aktive og fremtidige bookinger (Bekræftet og indtjekket)
(18, 11, 423, '2026-11-01', '2026-11-04', 2, 5100.00, 'confirmed', NULL),
(19, 12, 435, '2026-11-05', '2026-11-08', 2, 7200.00, 'confirmed', NULL),
-- Annulleret booking (Test af soft delete)
(20, 2, 501, '2026-11-10', '2026-11-12', 1, 2100.00, 'cancelled', NULL);

-- 7. Barsalg Transaktioner (Helene Christine HC01 og Mads MD01)
-- Salg 1: Helene Christine - 2 Cocktails
INSERT INTO sales (id, employee_id, sale_time, total_amount_dkk) VALUES
(1, 1, '2026-03-15 20:15:00', 250.00);
INSERT INTO sale_lines (sale_id, product_id, quantity, unit_price_dkk, line_total_dkk) VALUES
(1, 1, 2, 125.00, 250.00); -- Espresso Martini

-- Salg 2: Helene Christine - 3 Kaffer
INSERT INTO sales (id, employee_id, sale_time, total_amount_dkk) VALUES
(2, 1, '2026-03-16 10:30:00', 144.00);
INSERT INTO sale_lines (sale_id, product_id, quantity, unit_price_dkk, line_total_dkk) VALUES
(2, 24, 3, 48.00, 144.00); -- Cafe Latte

-- Salg 3: Helene Christine - 4 Cocktails & 2 Kaffe
INSERT INTO sales (id, employee_id, sale_time, total_amount_dkk) VALUES
(3, 1, '2026-06-20 21:45:00', 586.00);
INSERT INTO sale_lines (sale_id, product_id, quantity, unit_price_dkk, line_total_dkk) VALUES
(3, 3, 2, 130.00, 260.00), -- Old Fashioned
(3, 16, 2, 140.00, 280.00), -- Arthurs Royal Herb
(3, 25, 1, 48.00, 48.00), -- Cappuccino
(3, 21, 1, 32.00, 32.00); -- Espresso Single

-- Salg 4: Helene Christine - 1 Cocktail & 1 Kaffe
INSERT INTO sales (id, employee_id, sale_time, total_amount_dkk) VALUES
(4, 1, '2026-07-12 18:00:00', 165.00);
INSERT INTO sale_lines (sale_id, product_id, quantity, unit_price_dkk, line_total_dkk) VALUES
(4, 5, 1, 105.00, 105.00), -- Aperol Spritz
(4, 26, 1, 50.00, 50.00); -- Flat White

-- Salg 5: Mads Damsgaard (Anden medarbejder for at teste isolering af Helene)
INSERT INTO sales (id, employee_id, sale_time, total_amount_dkk) VALUES
(5, 2, '2026-07-15 22:10:00', 360.00);
INSERT INTO sale_lines (sale_id, product_id, quantity, unit_price_dkk, line_total_dkk) VALUES
(5, 4, 3, 120.00, 360.00); -- Negroni
