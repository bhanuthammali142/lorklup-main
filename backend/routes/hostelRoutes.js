const express = require('express')
const router  = express.Router()
const { getHostels, createHostel, updateHostel, createHostelWithOwner, onboardAdmin, bulkCreateHostels } = require('../controllers/hostelController')
const { verifyToken, checkRole } = require('../middleware/auth')

const tenantGuard = require('../middleware/tenantGuard');
const subscriptionGuard = require('../middleware/subscriptionGuard');
router.use(verifyToken);
router.use(tenantGuard);
router.use(subscriptionGuard);

router.get('/',                  getHostels)
router.post('/',                 checkRole('admin','super_admin'), createHostel)
router.put('/:id',               checkRole('admin','super_admin'), updateHostel)
router.post('/create-with-owner', checkRole('super_admin'),       createHostelWithOwner)
router.post('/onboard',           checkRole('admin'),             onboardAdmin)
router.post('/bulk',              checkRole('super_admin'),       bulkCreateHostels)

module.exports = router
