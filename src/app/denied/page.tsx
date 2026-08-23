import DeviceMap from "@/components/DeviceMap";
import { getMapDevices } from "@/lib/d1";

export const dynamic = "force-dynamic";

export default async function DeniedPage() {
  const mapDevices = await getMapDevices();

  return (
    <div className="min-h-screen font-serif font-normal flex items-center justify-center px-5 py-10">
      <div className="text-center max-w-md w-full">
        <h1 className="text-2xl mb-4">
          ✿ ❀ ❁ ❃ ❋
        </h1>
        <h2 className="text-xl mb-6">HTMLPG</h2>
        <p className="mb-4">
          To access the garden, visit a physical HTMLPG unit and scan the QR code on its display.
        </p>
        <p className="text-sm text-gray-500 mt-6">
          The QR code changes periodically. If your code expired, scan the current one.
        </p>
        <div className="mt-8 text-left">
          <h3 className="font-bold mb-2 text-center">Where are the devices?</h3>
          <DeviceMap devices={mapDevices} />
        </div>
      </div>
    </div>
  );
}
