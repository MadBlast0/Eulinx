import { ViewportProvider } from "./ViewportProvider"
import { DeviceProvider } from "./DeviceProvider"
import { ThemeProvider } from "./ThemeProvider"
import { SafeAreaProvider } from "../components/responsive"
import { LocalizationProvider } from "./LocalizationProvider"
import { FeatureFlagProvider } from "./FeatureFlagProvider"
import { ModalProvider } from "./ModalProvider"
import { ToastProvider } from "./ToastProvider"
import { NotificationProvider } from "./NotificationProvider"
import { PermissionProvider } from "./PermissionProvider"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ViewportProvider>
      <DeviceProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <LocalizationProvider>
              <FeatureFlagProvider>
                <ModalProvider>
                  <ToastProvider>
                    <NotificationProvider>
                      <PermissionProvider>
                        {children}
                      </PermissionProvider>
                    </NotificationProvider>
                  </ToastProvider>
                </ModalProvider>
              </FeatureFlagProvider>
            </LocalizationProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </DeviceProvider>
    </ViewportProvider>
  )
}
