async function test() {
    const emailjsPayload = {
        service_id: 'service_zr89ur7',
        template_id: 'template_n8wuhcb',
        user_id: 'OgS0_kxEX5YjdwsAc',
        accessToken: 'shV4jUPFD16wmr9aNmmmo',
        template_params: {
            to_email: 'saisathwikm2005@gmail.com',
            otp: '123456',
            expiry_time: '15 mins'
        }
    };

    console.log('Sending payload:', JSON.stringify(emailjsPayload, null, 2));

    try {
        const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailjsPayload)
        });

        const status = emailRes.status;
        const text = await emailRes.text();
        console.log(`Status: ${status}`);
        console.log(`Response: ${text}`);
    } catch (err) {
        console.error(err);
    }
}
test();
