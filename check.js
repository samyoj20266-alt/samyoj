async function check() {
  try {
    const res = await fetch('https://samyoj-backend.onrender.com/api/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: "saisathwikm2005@gmail.com", isPhone: false })
    });
    console.log(`STATUS: ${res.status}`);
    const html = await res.text();
    console.log(`BODY: ${html}`);
  } catch (err) {
    console.error(err);
  }
}
check();
