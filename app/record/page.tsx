import Nav from '@/components/shared/Nav'
import DataProvider from '@/components/shared/DataProvider'
import RecordView from '@/components/record/RecordView'

export default function RecordPage() {
  return (
    <DataProvider>
      <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20 min-h-screen">
        <Nav />
        <RecordView />
      </div>
    </DataProvider>
  )
}
