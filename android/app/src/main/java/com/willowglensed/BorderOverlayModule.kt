package com.willowglensed

import android.graphics.PixelFormat
import android.view.WindowManager
import android.view.Gravity
import android.graphics.Color
import android.view.View
import android.animation.ValueAnimator
import android.animation.ObjectAnimator
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BorderOverlayModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var overlayView: View? = null
    private var windowManager: WindowManager? = null
    private var animator: ValueAnimator? = null  // Changed from ObjectAnimator to ValueAnimator

    override fun getName(): String = "BorderOverlay"

    @ReactMethod
    fun showBorderOverlay() {
        val activity = currentActivity ?: return
        activity.runOnUiThread {
            try {
                if (overlayView == null) {
                    overlayView = View(reactApplicationContext).apply {
                        setBackgroundColor(Color.TRANSPARENT)
                    }

                    windowManager = activity.getSystemService(ReactApplicationContext.WINDOW_SERVICE) as WindowManager  // Added windowManager initialization

                    val params = WindowManager.LayoutParams().apply {
                        width = WindowManager.LayoutParams.MATCH_PARENT
                        height = WindowManager.LayoutParams.MATCH_PARENT
                        type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                        format = PixelFormat.TRANSLUCENT
                    }

                    windowManager?.addView(overlayView, params)
                }
                startBorderAnimation()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun startBorderAnimation() {
        animator?.cancel()
        animator = ValueAnimator.ofArgb(
            Color.TRANSPARENT,
            Color.parseColor("#FFFF6600")
        ).apply {
            duration = 500
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            addUpdateListener { animation ->
                overlayView?.setBackgroundColor(animation.animatedValue as Int)
            }
            start()
        }
    }

    @ReactMethod
    fun hideBorderOverlay() {
        try {
            animator?.cancel()
            animator = null
            overlayView?.let {
                windowManager?.removeView(it)
                overlayView = null
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}