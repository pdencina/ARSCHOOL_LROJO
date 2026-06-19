export default function PortalLoading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-40 bg-[#e8eaed] rounded-lg mb-2"/>
        <div className="h-4 w-56 bg-[#f3f4f6] rounded"/>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white border border-[#eceef1] rounded-xl p-5">
            <div className="h-3 w-20 bg-[#f3f4f6] rounded mb-3"/>
            <div className="h-7 w-14 bg-[#e8eaed] rounded"/>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#eceef1] rounded-xl p-1">
        <div className="h-10 bg-[#f9fafb] rounded-t-lg border-b border-[#eceef1]"/>
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-[#f3f4f6]">
            <div className="h-4 w-24 bg-[#f3f4f6] rounded"/>
            <div className="h-4 w-32 bg-[#f3f4f6] rounded"/>
            <div className="h-5 w-16 bg-[#f3f4f6] rounded-md ml-auto"/>
          </div>
        ))}
      </div>
    </div>
  )
}
