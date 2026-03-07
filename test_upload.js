const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
    try {
        // Create a dummy 1x1 GIF file
        const dummyImage = Buffer.from(
            'R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=',
            'base64'
        );
        const tempPath = './dummy.gif';
        fs.writeFileSync(tempPath, dummyImage);

        // Create form data
        const form = new FormData();
        form.append('file', fs.createReadStream(tempPath));

        console.log('Sending request to backend...');
        // Replace with the actual token if authorization is required
        const response = await axios.post(
            'http://140.245.71.91:8000/schedule/image/append?iSchedulePK=74&iLocationPK=0',
            form,
            {
                headers: {
                    ...form.getHeaders()
                }
            }
        );

        console.log('Success:', response.status, response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    } finally {
        if (fs.existsSync('./dummy.gif')) {
            fs.unlinkSync('./dummy.gif');
        }
    }
}

testUpload();
