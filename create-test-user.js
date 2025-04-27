import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db, pool } from './server/db.ts';
import { storage } from './server/storage.ts';
import { config } from 'dotenv';

config();

// Use promisify to get async versions of scrypt
const scryptAsync = promisify(scrypt);

// Hash password with salt
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestUser() {
  try {
    console.log('Creating a test user with proper password hashing...');
    
    // Check if test user already exists
    const testUsername = 'testuser';
    const existingUser = await storage.getUserByUsername(testUsername);
    
    if (existingUser) {
      console.log(`Test user '${testUsername}' already exists with ID: ${existingUser.id}`);
      return existingUser;
    }
    
    // Hash password
    const password = 'password123';
    const hashedPassword = await hashPassword(password);
    console.log(`Generated hashed password: ${hashedPassword}`);
    
    // Create user
    const newUser = await storage.createUser({
      username: testUsername,
      email: 'test@example.com',
      password: hashedPassword
    });
    
    console.log(`Created test user '${testUsername}' with ID: ${newUser.id}`);
    console.log('You can now use this user in your tests with:');
    console.log(`   Username: ${testUsername}`);
    console.log(`   Password: ${password}`);
    
    return newUser;
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});