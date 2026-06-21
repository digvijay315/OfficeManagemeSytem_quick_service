const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://digvijay:digvijay@cluster0.yisihts.mongodb.net/officeStaffManagement_quick_service?retryWrites=true&w=majority');

        // await mongoose.connect('mongodb://127.0.0.1:27017/officeStaffManagement_quick_service');
        
        console.log('MongoDB connected successfully');
        
        
        // Ensure default admin exists
        const adminCheck = await User.findOne({ email: 'admin@gmail.com' });
        if (!adminCheck) {
            await User.create({
                name: 'Admin',
                email: 'admin@gmail.com',
                password: 'admin@123',
                role: 'admin'
            });
            console.log('Default admin created.');
        }
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
