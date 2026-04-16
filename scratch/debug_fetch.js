const targetEmail = 'dlitorresg@gmail.com';
const url = 'https://kjcwozzfzbizxurppxlf.supabase.co/functions/v1/create-user-temp';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTMyNjgsImV4cCI6MjA4NjAyOTI2OH0.UEziql_VLY92Opgngmf-LBEYmFzduVMKFcwEviV99NE';

async function test() {
    console.log(`Testing with ${targetEmail}...`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'apikey': key,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: targetEmail,
            full_name: 'Debug User'
        })
    });

    console.log('Status:', resp.status);
    const text = await resp.text();
    console.log('Body:', text);
}

test();
