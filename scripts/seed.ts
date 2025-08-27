#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Yacht, Blog } from '../src/core/models/index.js';

dotenv.config({ path: '.env.development' });

const seedData = {
    users: [
        {
            name: 'Admin User',
            email: 'admin@faraway.com',
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqQK8K', // password123
            phone: '+1234567890',
            role: 'admin'
        },
        {
            name: 'John Doe',
            email: 'john@example.com',
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqQK8K',
            phone: '+1987654321',
            role: 'user'
        }
    ],
    yachts: [
        {
            name: 'Luxury Motor Yacht',
            description: 'A beautiful luxury motor yacht perfect for cruising',
            type: 'motor',
            length: 50,
            capacity: 12,
            price: 5000,
            location: 'Miami, FL',
            amenities: ['WiFi', 'Kitchen', 'Bedrooms', 'Bathrooms']
        },
        {
            name: 'Sailing Catamaran',
            description: 'Elegant sailing catamaran for adventure seekers',
            type: 'catamaran',
            length: 40,
            capacity: 8,
            price: 3000,
            location: 'San Diego, CA',
            amenities: ['Sailing Equipment', 'Kitchen', 'Sleeping Quarters']
        }
    ],
    blogs: [
        {
            title: 'Top 10 Yacht Destinations',
            content: 'Discover the most beautiful yacht destinations around the world...',
            category: 'travel',
            author: 'Travel Expert',
            tags: ['yachting', 'travel', 'destinations']
        },
        {
            title: 'Yacht Maintenance Tips',
            content: 'Essential maintenance tips to keep your yacht in perfect condition...',
            category: 'yachting',
            author: 'Yacht Specialist',
            tags: ['maintenance', 'yachting', 'tips']
        }
    ]
};

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Clear existing data
        await User.deleteMany({});
        await Yacht.deleteMany({});
        await Blog.deleteMany({});
        console.log('🧹 Cleared existing data');

        // Seed users
        const users = await User.insertMany(seedData.users);
        console.log(`👥 Created ${users.length} users`);

        // Seed yachts
        const yachts = await Yacht.insertMany(seedData.yachts);
        console.log(`⛵ Created ${yachts.length} yachts`);

        // Seed blogs
        const blogs = await Blog.insertMany(seedData.blogs);
        console.log(`📝 Created ${blogs.length} blogs`);

        console.log('✅ Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();
