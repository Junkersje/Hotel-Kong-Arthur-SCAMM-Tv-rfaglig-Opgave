import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'hotel_admin',
  password: 'secret_password_here',
  database: 'hotel_kong_arthur'
});

async function main() {
  console.log('=== 1. Tjekker alle sekvenser op mod MAX(id) og rækkeantal ===');
  const tables = [
    'country',
    'season',
    'room_type',
    'room',
    'room_price',
    'costumer',
    'booking',
    'category',
    'product'
  ];

  for (const t of tables) {
    const maxRes = await pool.query('SELECT MAX(id) AS max_id, COUNT(*) AS count FROM ' + t);
    const seqNameRes = await pool.query("SELECT pg_get_serial_sequence('" + t + "', 'id') AS seq");
    const seqName = seqNameRes.rows[0].seq;
    const seqValRes = await pool.query('SELECT last_value, is_called FROM ' + seqName);
    const maxId = Number(maxRes.rows[0].max_id);
    const count = Number(maxRes.rows[0].count);
    const seqVal = Number(seqValRes.rows[0].last_value);
    const isCalled = seqValRes.rows[0].is_called;

    const status = seqVal >= maxId ? 'OK' : 'MISMATCH';
    console.log(
      `Tabel: ${t.padEnd(12)} | Rækker: ${String(count).padStart(5)} | MAX(id): ${String(maxId).padStart(5)} | Sekvens: ${String(seqVal).padStart(5)} | ${status}`
    );
  }

  console.log('\n=== 2. Opretter en ny booking med helt NY kunde og NYT land via API ===');
  const uniqueId = Date.now().toString().slice(-6);
  const testEmail = `converge_test_${uniqueId}@test.dk`;
  const testCountry = `TestLand_${uniqueId}`;

  const payload = {
    first_name: 'Convergence',
    last_name: 'Tester',
    email: testEmail,
    phone_number: '+45 12345678',
    country: testCountry,
    room_type_id: 1, // standard_single
    num_guests: 1,
    check_in_date: '2027-05-10',
    check_out_date: '2027-05-13'
  };

  const response = await fetch('http://localhost:5000/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  console.log('HTTP Status:', response.status);
  console.log('Location Header:', response.headers.get('location'));
  console.log('Booking Resultat:', JSON.stringify(body, null, 2));

  // Valider i databasen
  console.log('\n=== 3. Validerer de oprettede rækker og ID-intervaller i PostgreSQL ===');
  const countryInDb = await pool.query('SELECT * FROM country WHERE name = $1', [testCountry]);
  console.log('Oprettet Land i DB:', countryInDb.rows[0]);

  const customerInDb = await pool.query('SELECT * FROM costumer WHERE email = $1', [testEmail]);
  console.log('Oprettet Kunde i DB:', customerInDb.rows[0]);

  const bookingInDb = await pool.query('SELECT * FROM booking WHERE id = $1', [body.data.id]);
  console.log('Oprettet Booking i DB:', bookingInDb.rows[0]);

  // Sikr at ID er STØRRE end højeste seed ID
  if (bookingInDb.rows[0].id > 1000) {
    console.log(`\nBekræftet: Booking ID (${bookingInDb.rows[0].id}) er strengt større end seed data (1000) uden interferens.`);
  } else {
    console.error('Fejl: Booking ID overlapper med seed data!');
  }

  if (customerInDb.rows[0].id >= 950) {
    console.log(`Bekræftet: Costumer ID (${customerInDb.rows[0].id}) er i det korrekte interval efter seed data uden konflikt.`);
  }

  console.log('\n=== 4. Tester gentagen booking for EKSISTERENDE kunde ===');
  const secondBookingPayload = {
    first_name: 'Convergence',
    last_name: 'Tester Opdateret',
    email: testEmail,
    phone_number: '+45 87654321',
    country: testCountry,
    room_type_id: 2, // standard_double
    num_guests: 2,
    check_in_date: '2027-06-01',
    check_out_date: '2027-06-05'
  };

  const secondRes = await fetch('http://localhost:5000/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(secondBookingPayload)
  });
  const secondBody = await secondRes.json();
  console.log('Anden booking status:', secondRes.status);
  console.log('Anden booking ID:', secondBody.data.id);
  console.log('Genbrugt kunde ID:', secondBody.data.customer_id);

  if (secondBody.data.customer_id === customerInDb.rows[0].id) {
    console.log('Bekræftet: Eksisterende kunde blev genbrugt uden at oprette et unødvendigt nyt ID.');
  }

  // Tjek at kunden blev opdateret
  const updatedCustomer = await pool.query('SELECT * FROM costumer WHERE id = $1', [secondBody.data.customer_id]);
  console.log('Kunde efter opdatering:', updatedCustomer.rows[0].last_name, updatedCustomer.rows[0].phone_number);

  await pool.end();
}

main().catch(err => {
  console.error('Verifikationsfejl:', err);
  process.exit(1);
});
