import Nav from '@/components/shared/Nav'
import DataProvider from '@/components/shared/DataProvider'
import StudioView from '@/components/studio/StudioView'

export default function StudioPage() {
  return (
    <DataProvider>
      <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20 min-h-screen">
        <Nav />
        <StudioView />
      </div>
    </DataProvider>
  )
}
