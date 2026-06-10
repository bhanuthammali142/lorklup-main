const express = require('express')
const router  = express.Router()
const { getStudents, addStudent, updateStudent, deleteStudent, bulkAddStudents, getStudentSelfProfile } = require('../controllers/studentController')
const { verifyToken, checkRole } = require('../middleware/auth')

const tenantGuard = require('../middleware/tenantGuard');
const subscriptionGuard = require('../middleware/subscriptionGuard');
router.use(verifyToken);
router.use(tenantGuard);
router.use(subscriptionGuard);

router.get('/profile/me', getStudentSelfProfile)
router.get('/',     getStudents)
router.post('/',    checkRole('admin','super_admin'), addStudent)
router.put('/:id',  checkRole('admin','super_admin'), updateStudent)
router.delete('/:id', checkRole('admin','super_admin'), deleteStudent)
router.post('/bulk', checkRole('admin','super_admin'), bulkAddStudents)

module.exports = router
