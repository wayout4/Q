import Foundation
import Network
import CoreTelephony

/// Read-only iOS connectivity snapshot. This does not control the modem.
@available(iOS 15.0, *)
final class QOSConnectivityAdapter {
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "org.quantumos.connectivity-monitor")
    private let lock = NSLock()
    private var latestPath: NWPath?

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            self.lock.lock()
            self.latestPath = path
            self.lock.unlock()
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }

    func snapshot() -> [String: Any] {
        lock.lock()
        let path = latestPath
        lock.unlock()

        let status = path?.status == .satisfied
        let interface: String
        if let path = path, path.usesInterfaceType(.wifi) {
            interface = "Wi-Fi"
        } else if let path = path, path.usesInterfaceType(.cellular) {
            interface = "Unknown"
        } else {
            interface = "Unknown"
        }

        // CoreTelephony values are intentionally not promoted to exact 5G NSA/SA.
        // API availability and reporting vary by iOS version, carrier and device.
        var radioTechnology = interface
        if interface == "Unknown" {
            radioTechnology = "Unknown"
        }

        return [
            "source": "native-ios",
            "online": status,
            "effectiveType": "unknown",
            "downlinkMbps": NSNull(),
            "rttMs": NSNull(),
            "saveData": NSNull(),
            "radioAccessTechnology": radioTechnology,
            "registered": NSNull(),
            "roaming": NSNull(),
            "carrier": NSNull(),
            "serviceReachability": "not-verified"
        ]
    }
}
