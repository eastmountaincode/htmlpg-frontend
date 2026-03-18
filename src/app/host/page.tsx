import { HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';

export default function HostPage() {
    return (
        <div className="min-h-screen font-serif font-normal">
            <div className="text-center mx-5 my-5">
                <img src="/illustrations/star_logo.png" alt="" className="w-8 mx-auto mb-1" />
                <h2 className="text-xl">
                    ✿ ❀ ❁ ❃ ❋ <br />
                    HTML Pollinator Garden <br />
                    ❋ ❃ ❁ ❀ ✿
                </h2>
            </div>

            <div className="max-w-sm mx-auto px-5 pb-10 text-sm text-gray-800 space-y-6">
                <img src="/illustrations/star_figure.png" alt="" className="w-64 mx-auto" />
                <div className="space-y-3">
                    <h3 className="font-bold text-base">Host an HTMLPG</h3>
                    <p>
                        HTML Pollinator Garden is like a{' '}
                        <a href="https://littlefreelibrary.org/" target="_blank" rel="noopener noreferrer" className="underline">
                            Little Free Library
                        </a>{' '}
                        but for <b>files</b> instead of books. It&rsquo;s a small e-ink device with a QR code that
                        lets anyone nearby share files with each other: images, songs, PDFs, whatever.
                    </p>
                    <p>There are many HTMLPG devices in the wild, hosted by small businesses and community spaces.
                        All devices share the same 4 &quot;boxes&quot;.</p>
                    <p>
                        Files come and go. When someone downloads a file, it disappears from the box for
                        everyone, just like borrowing a book. The QR code changes every 30 minutes ensuring
                        that files come from people who were physically present at the location of the HTMLPG device.
                    </p>
                </div>

                <img src="/images/devices_picture.png" alt="An HTMLPG device" className="w-full" />
                <p className="text-center text-xs text-gray-500">Here&apos;s what they look like!</p>

                <div className="space-y-3">

                    <h3 className="font-bold text-base">What does hosting involve?</h3>
                    <p>Almost nothing. As a host, you just need to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><span className="font-bold">Keep it plugged in.</span> The device needs power via a standard USB-C cable. That&rsquo;s it.</li>
                        <li><span className="font-bold">Connect it to Wi-Fi.</span> On first setup we&rsquo;ll connect it to your network together. If your Wi-Fi password changes, we&rsquo;ll reconnect it.</li>
                    </ul>
                    <p>There are no buttons to press, nothing to maintain, and no software to install. The device runs itself.</p>
                </div>

                <div className="space-y-3">
                    <h3 className="font-bold text-base">What about inappropriate content?</h3>
                    <p>
                        Like a Little Free Library, people have to be physically present to use it,
                        which deters misuse. </p>


                    <p>
                        You have access to an admin portal at{' '}
                        <a href="https://htmlpg.andrew-boylan.com/admin" className="underline">htmlpg.andrew-boylan.com/admin</a>{' '}
                        (password: <span className="font-mono bg-gray-100 px-1">htmlpg2025</span>)
                        where you can see what&rsquo;s in the boxes and remove anything that shouldn&rsquo;t be there.</p>
                </div>

                <div className="space-y-3">
                    <h3 className="font-bold text-base">Where should I put it?</h3>
                    <p>
                        Anywhere people pass by and might notice it &mdash; a front desk, a counter, a
                        communal table, near the entrance. The e-ink screen is small (about the size of a
                        phone) and looks good sitting on a shelf or mounted on a wall.
                    </p>
                </div>

                <div className="space-y-3">
                    <h3 className="font-bold text-base">What does it cost?</h3>
                    <p>
                        Nothing. The device uses your Wi-Fi, but the bandwidth and power usage are
                        negligible &mdash; files are capped at 100MB and only 4 can exist at a time.
                        We just ask that you keep it plugged in and in a place where people can see it.
                    </p>
                </div>

                <img src="/illustrations/yoyo.png" alt="" className="w-48 mx-auto" />


                <div className="space-y-3">
                    <h3 className="font-bold text-base">Contact</h3>
                    <p className="flex items-center gap-2"><HiOutlineMail className="shrink-0" /> {'andrewe'}{'boylan'}{'@'}{'gmail'}{'.'}{'com'}</p>
                    <p className="flex items-center gap-2"><HiOutlinePhone className="shrink-0" /> {'513'}&#45;{'235'}&#45;{'7254'}</p>
                </div>
            </div>
        </div>
    );
}
