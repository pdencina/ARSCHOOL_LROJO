export default function DashboardLoading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 w-48 bg-[#e8eaed] rounded-lg mb-2"/>
          <div className="h-4 w-32 bg-[#f3f4f6] rounded"/>
        </div>
        <div className="h-10 w-32 bg-[#e8eaed] rounded-lg"/>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white border border-[#eceef1] rounded-xl p-5">
            <div className="h-3 w-20 bg-[#f3f4f6] rounded mb-3"/>
            <div className="h-7 w-16 bg-[#e8eaed] rounded"/>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#eceef1] rounded-xl p-1">
        <div className="h-10 bg-[#f9fafb] rounded-t-lg border-b border-[#eceef1]"/>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-[#f3f4f6]">
            <div className="w-8 h-8 bg-[#f3f4f6] rounded-full"/>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-[#f3f4f6] rounded"/>
              <div className="h-3 w-24 bg-[#f9fafb] rounded"/>
            </div>
            <div className="h-5 w-16 bg-[#f3f4f6] rounded-md"/>
          </div>
        ))}
      </div>
    </div>
  )
}
