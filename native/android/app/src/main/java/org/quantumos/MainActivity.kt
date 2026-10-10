package org.quantumos

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

/**
 * Minimal buildable native host. The connectivity adapter is read-only and
 * returns Unknown when Android permissions or OS signals are unavailable.
 */
class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val status = TextView(this).apply {
            text = "QOS Native Host\nConnectivity adapter available to host integration.\nRadio and service reachability are not asserted by this screen."
            textSize = 18f
            setPadding(32, 48, 32, 32)
        }
        setContentView(status)
    }
}
