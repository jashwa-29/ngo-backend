const cron = require('node-cron');
const DonationRequest = require('../models/DonationRequest');
const Donation = require('../models/Donation');
const Notification = require('../models/Notification');

/**
 * Checks all 'approved' donation requests and updates their status to 'achieved' 
 * if the funding goal has been met.
 */
const syncAchievedStatus = async () => {
    console.log('[Scheduler] Running achieved status synchronization...');
    try {
        // Find all approved requests that might have reached their goal
        const approvedRequests = await DonationRequest.find({ status: 'approved' });
        
        for (const request of approvedRequests) {
            const requestId = request._id;
            
            // Sum only successful donations
            const successfulDonations = await Donation.find({ requestId, status: "success" });
            const totalRaised = successfulDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            
            // Defensive parsing for goal amount
            const rawGoal = request.donationamount?.toString() || "0";
            const goalAmount = parseFloat(rawGoal.replace(/[^0-9.]/g, ''));

            if (!isNaN(goalAmount) && goalAmount > 0 && totalRaised >= goalAmount) {
                console.log(`[Scheduler] Goal detected for: ${request.patientname}. Updating status to 'achieved'...`);
                
                request.status = 'achieved';
                await request.save();

                // Check if notification already exists to avoid duplicates from scheduler
                const existingNotification = await Notification.findOne({
                    relatedId: requestId,
                    type: 'goal_achieved'
                });

                if (!existingNotification) {
                    try {
                        await Notification.create({
                            type: 'goal_achieved',
                            message: `Goal Achieved: The mission for ${request.patientname} has been fully funded! Target: ${goalAmount}, Total Raised: ${totalRaised}.`,
                            relatedId: request._id,
                            onModel: 'DonationRequest'
                        });
                        console.log(`[Scheduler] Admin notification created for ${request.patientname}.`);
                    } catch (notificationError) {
                        console.error(`[Scheduler] Failed to create notification:`, notificationError);
                    }
                }
            }
        }
        console.log('[Scheduler] Synchronization complete.');
    } catch (error) {
        console.error('[Scheduler] Error during synchronization:', error);
    }
};

/**
 * Deletes pending donations that have not been completed within 20 minutes.
 */
const cleanupPendingDonations = async () => {
    console.log('[Scheduler] Running cleanup for expired pending donations...');
    try {
        const expirationTime = 20 * 60 * 1000; // 20 minutes in milliseconds
        const thresholdDate = new Date(Date.now() - expirationTime);

        const result = await Donation.deleteMany({
            status: 'pending',
            createdAt: { $lt: thresholdDate }
        });

        if (result.deletedCount > 0) {
            console.log(`[Scheduler] Deleted ${result.deletedCount} expired pending donations.`);
        }
    } catch (error) {
        console.error('[Scheduler] Error during pending donations cleanup:', error);
    }
};

// Initialize the cron job to run every 5 minutes
const initStatusScheduler = () => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', () => {
        syncAchievedStatus();
        cleanupPendingDonations();
    });
    
    // Also run immediately on server start to catch any missed updates
    syncAchievedStatus();
    cleanupPendingDonations();
    
    console.log('✅ Background Status Scheduler initialized (Every 5 mins)');
};

module.exports = {
    initStatusScheduler,
    syncAchievedStatus
};
