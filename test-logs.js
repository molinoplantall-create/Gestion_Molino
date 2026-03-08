const url = "https://rdcwtvmbilfbybzjxltc.supabase.co/rest/v1/milling_logs?select=*&limit=1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkY3d0dm1iaWxmYnliemp4bHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzc1NjYsImV4cCI6MjA4MzkxMzU2Nn0._Quxv_OMncC6WPtxaINRr8nJnKQEwxmV4l-h9RbuN5k";

fetch(url, {
    headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
    }
})
    .then(res => res.json())
    .then(data => {
        console.log("Milling logs schema test:", JSON.stringify(data, null, 2));
    })
    .catch(err => console.error(err));
