package org.quantumos.connectivity

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import org.json.JSONObject

/**
 * Read-only connectivity snapshot for a trusted QOS native host.
 * Does not switch radio modes or access subscriber identifiers.
 */
class QosConnectivityPlugin(private val context: Context) {
    fun snapshot(): JSONObject {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork
        val caps = network?.let { cm.getNetworkCapabilities(it) }
        val online = caps != null && (
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        )
        val wifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        val cellular = caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true

        var rat = "Unknown"
        var registered: Boolean? = null
        if (cellular && ContextCompat.checkSelfPermission(
                context, Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            try {
                rat = when (tm.dataNetworkType) {
                    TelephonyManager.NETWORK_TYPE_GPRS,
                    TelephonyManager.NETWORK_TYPE_EDGE,
                    TelephonyManager.NETWORK_TYPE_CDMA,
                    TelephonyManager.NETWORK_TYPE_1xRTT,
                    TelephonyManager.NETWORK_TYPE_IDEN,
                    TelephonyManager.NETWORK_TYPE_GSM -> "2G"
                    TelephonyManager.NETWORK_TYPE_UMTS,
                    TelephonyManager.NETWORK_TYPE_EVDO_0,
                    TelephonyManager.NETWORK_TYPE_EVDO_A,
                    TelephonyManager.NETWORK_TYPE_EVDO_B,
                    TelephonyManager.NETWORK_TYPE_HSDPA,
                    TelephonyManager.NETWORK_TYPE_HSUPA,
                    TelephonyManager.NETWORK_TYPE_HSPA,
                    TelephonyManager.NETWORK_TYPE_EHRPD,
                    TelephonyManager.NETWORK_TYPE_HSPAP,
                    TelephonyManager.NETWORK_TYPE_TD_SCDMA -> "3G"
                    TelephonyManager.NETWORK_TYPE_LTE -> "4G/LTE"
                    TelephonyManager.NETWORK_TYPE_NR -> "5G NR (SA/NSA unknown)"
                    else -> "Unknown"
                }
                registered = tm.dataNetworkType != TelephonyManager.NETWORK_TYPE_UNKNOWN
            } catch (_: SecurityException) {
                rat = "Unknown"
                registered = null
            } catch (_: RuntimeException) {
                rat = "Unknown"
                registered = null
            }
        }

        // Prefer the active data transport. A Wi-Fi connection does not prove
        // that cellular registration is present or that a QOS server is reachable.
        if (wifi) rat = "Wi-Fi"
        return JSONObject()
            .put("source", "native-android")
            .put("online", online)
            .put("effectiveType", "unknown")
            .put("downlinkMbps", JSONObject.NULL)
            .put("rttMs", JSONObject.NULL)
            .put("saveData", JSONObject.NULL)
            .put("radioAccessTechnology", rat)
            .put("registered", registered ?: JSONObject.NULL)
            .put("roaming", JSONObject.NULL)
            .put("carrier", JSONObject.NULL)
            .put("serviceReachability", "not-verified")
    }
}
