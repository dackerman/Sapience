import axios from 'axios';

// First, log in as demo user
async function testProfileUpdates() {
  try {
    console.log('Attempting to log in...');
    
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'demo',
      password: 'demo123'
    }, { 
      withCredentials: true 
    });
    
    console.log('Login response:', loginResponse.data);
    
    // Save the cookies from the response
    const cookies = loginResponse.headers['set-cookie'];
    
    if (!cookies) {
      console.error('No cookies received from login');
      return;
    }
    
    console.log('Cookies received:', cookies);
    
    // Now update profile with new interests
    console.log('Updating profile...');
    const profileResponse = await axios.put('http://localhost:5000/api/profile', {
      interests: 'JavaScript, web development, Node.js, React, and database technologies'
    }, {
      headers: {
        Cookie: cookies.join('; ')
      },
      withCredentials: true
    });
    
    console.log('Profile update response:', profileResponse.data);
    console.log('Check server logs to see if recommendations were deleted and reprocessing was triggered');
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testProfileUpdates();