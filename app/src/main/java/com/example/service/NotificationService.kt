package com.example.service

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.example.utils.NotificationHelper

class NotificationService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("NotificationService", "New FCM Token: $token")
        // Can sync with Supabase user_tokens table if needed
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        val title = remoteMessage.notification?.title ?: remoteMessage.data["title"] ?: "Rodríguez Barbería"
        val body = remoteMessage.notification?.body ?: remoteMessage.data["body"] ?: "Tienes una actualización de tu cita."
        
        NotificationHelper.showNotification(applicationContext, title, body)
    }
}
