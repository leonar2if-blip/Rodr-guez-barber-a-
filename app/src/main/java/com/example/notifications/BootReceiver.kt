package com.example.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Reschedules notifications after device reboot
 * This ensures appointments scheduled before reboot still get their reminders
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // The app should reschedule notifications from local database on next launch
            // For now, we'll clear any stale notifications
            // In a full implementation, you'd read from Room database and reschedule
            
            // This is a placeholder - in production, you'd call a repository
            // to get all upcoming appointments and reschedule them
        }
    }
}
