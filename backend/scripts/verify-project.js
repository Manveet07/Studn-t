const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const required = [
  'server.js', 'package.json', 'config/db.js', 'middleware/auth.js',
  'models/User.js', 'models/Doubt.js', 'models/Reply.js', 'models/Notification.js',
  'controllers/authController.js', 'controllers/notificationController.js', 'controllers/doubtController.js',
  'routes/auth.js', 'routes/users.js', 'routes/doubts.js', 'routes/replies.js', 'routes/events.js', 'routes/notifications.js', '.env.example'
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) { console.error('Missing required files:', missing.join(', ')); process.exit(1); }
const pkg = require(path.join(root, 'package.json'));
if (!pkg.scripts || !pkg.scripts.start) { console.error('Missing npm start script'); process.exit(1); }
console.log('Studnt project structure check passed.');
console.log('Live MongoDB/Render connectivity must be verified after setting environment variables.');
