package com.example.data.repository

import android.content.Context
import com.example.data.database.PreferencesManager
import com.example.data.models.Profile
import com.example.service.AuthService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class AuthRepository(context: Context) {
    private val authService = AuthService()
    private val prefs = PreferencesManager(context)

    val isDarkMode: Flow<Boolean> = prefs.isDarkMode
    val userPhone: Flow<String> = prefs.userPhone
    val userRole: Flow<String> = prefs.userRole
    val userId: Flow<String> = prefs.userId
    val userFullName: Flow<String> = prefs.userFullName
    val authToken: Flow<String> = prefs.authToken

    suspend fun login(phone: String, pass: String): Result<Profile> {
        val result = authService.login(phone, pass)
        if (result.isSuccess) {
            val profile = result.getOrNull()!!
            prefs.saveUserSession(
                id = profile.id,
                phone = profile.phone,
                role = profile.role,
                fullName = profile.fullName,
                token = profile.id // or session token
            )
        }
        return result
    }

    suspend fun register(phone: String, fullName: String, pass: String): Result<Profile> {
        val result = authService.register(phone, fullName, pass)
        if (result.isSuccess) {
            val profile = result.getOrNull()!!
            prefs.saveUserSession(
                id = profile.id,
                phone = profile.phone,
                role = profile.role,
                fullName = profile.fullName,
                token = profile.id
            )
        }
        return result
    }

    suspend fun updatePhone(newPhone: String): Result<Profile> {
        val currentId = userId.first()
        val res = authService.updatePhone(currentId, newPhone)
        if (res.isSuccess) {
            prefs.updateUserPhone(newPhone)
        }
        return res
    }

    suspend fun setDarkMode(enabled: Boolean) {
        prefs.setDarkMode(enabled)
    }

    suspend fun logout() {
        prefs.clearSession()
    }
}
