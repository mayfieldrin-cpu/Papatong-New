import Nav from '@/components/shared/Nav'
import DataProvider from '@/components/shared/DataProvider'
import PracticeView from '@/components/practice/PracticeView'

export default function PracticePage() {
  return (
    <DataProvider>
      <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20 min-h-screen">
        <Nav />
        <PracticeView />
      </div>
    </DataProvider>
  )
}
