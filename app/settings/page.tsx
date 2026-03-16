import Nav from '@/components/shared/Nav'
import DataProvider from '@/components/shared/DataProvider'
import SettingsView from '@/components/studio/SettingsView'

export default function SettingsPage() {
  return (
    <DataProvider>
      <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20 min-h-screen">
        <Nav />
        <SettingsView />
      </div>
    </DataProvider>
  )
}
