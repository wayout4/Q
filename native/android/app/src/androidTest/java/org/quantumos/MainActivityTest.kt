package org.quantumos

import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainActivityTest {
    @Test
    fun launchesAndShowsExplicitConnectivityLimitations() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val content = activity.findViewById<android.view.View>(android.R.id.content)
                assertTrue("Expected a visible content view", content != null)
                val text = (content as android.view.ViewGroup).getChildAt(0) as TextView
                assertTrue(text.text.toString().contains("QOS Native Host"))
                assertTrue(text.text.toString().contains("not asserted"))
            }
        }
    }
}
