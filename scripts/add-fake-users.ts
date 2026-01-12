import { create } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { User } from '../types';

async function addFakeUsers() {
  console.log('🤖 Adding fake users to database...');

  const fakeUsers = [
    {
      email: 'john.doe@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      address: '123 Main St, City, Country',
    },
    {
      email: 'jane.smith@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1234567891',
      address: '456 Oak Ave, City, Country',
    },
    {
      email: 'mike.johnson@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'Mike',
      lastName: 'Johnson',
      phone: '+1234567892',
      address: '789 Pine Rd, City, Country',
    },
    {
      email: 'sarah.wilson@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'Sarah',
      lastName: 'Wilson',
      phone: '+1234567893',
      address: '321 Elm St, City, Country',
    },
    {
      email: 'david.brown@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'David',
      lastName: 'Brown',
      phone: '+1234567894',
      address: '654 Maple Dr, City, Country',
    },
    {
      email: 'lisa.davis@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'Lisa',
      lastName: 'Davis',
      phone: '+1234567895',
      address: '987 Cedar Ln, City, Country',
    },
    {
      email: 'alex.garcia@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'Alex',
      lastName: 'Garcia',
      phone: '+1234567896',
      address: '147 Birch Ave, City, Country',
    },
    {
      email: 'emma.martinez@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'Emma',
      lastName: 'Martinez',
      phone: '+1234567897',
      address: '258 Spruce St, City, Country',
    },
    {
      email: 'ryan.anderson@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'Ryan',
      lastName: 'Anderson',
      phone: '+1234567898',
      address: '369 Willow Rd, City, Country',
    },
    {
      email: 'olivia.taylor@example.com',
      password: 'password123',
      role: 'USER' as const,
      firstName: 'Olivia',
      lastName: 'Taylor',
      phone: '+1234567899',
      address: '741 Poplar Dr, City, Country',
    },
  ];

  for (const userData of fakeUsers) {
    try {
      const hashedPassword = await hashPassword(userData.password);
      const user: User = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        address: userData.address,
        createdAt: new Date().toISOString(),
      };

      create<User>('users', user);
      console.log(`✅ Created user: ${userData.firstName} ${userData.lastName} (${userData.email})`);
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.email}:`, error);
    }
  }

  console.log('✨ Fake users added successfully!');
  process.exit(0);
}

addFakeUsers().catch((error) => {
  console.error('❌ Adding fake users failed:', error);
  process.exit(1);
});
