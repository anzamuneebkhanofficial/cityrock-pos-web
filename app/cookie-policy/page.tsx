import React from "react";
import Link from "next/link";
import { FooterCookieLink } from "@/components/consent/FooterCookieLink";

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-indigo-500 hover:underline mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-3xl font-bold">Cookie Policy</h1>
        <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="bg-amber-900/20 border border-amber-500/30 text-amber-200 p-4 rounded-lg">
          <strong>Draft Notice:</strong> This is a starting draft that must be reviewed by a lawyer before launch. Do not present it as legal advice.
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What are cookies?</h2>
          <p className="text-gray-300 leading-relaxed">
            Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide reporting information and assist with service personalization.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How we use cookies</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="py-3 pr-4 font-semibold text-gray-400">Name</th>
                  <th className="py-3 px-4 font-semibold text-gray-400">Provider</th>
                  <th className="py-3 px-4 font-semibold text-gray-400">Purpose</th>
                  <th className="py-3 px-4 font-semibold text-gray-400">Category</th>
                  <th className="py-3 pl-4 font-semibold text-gray-400">Duration</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-800/50">
                  <td className="py-3 pr-4 text-gray-300">cookie_consent</td>
                  <td className="py-3 px-4 text-gray-300">CityRock POS</td>
                  <td className="py-3 px-4 text-gray-300">Stores your cookie consent preferences.</td>
                  <td className="py-3 px-4 text-gray-300">Essential</td>
                  <td className="py-3 pl-4 text-gray-300">12 months</td>
                </tr>
                {/* Additional cookies can be added here */}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How to change or withdraw consent</h2>
          <p className="text-gray-300 leading-relaxed">
            You can change your cookie preferences at any time by clicking the button below. This will let you revisit the cookie consent banner and change your preferences or withdraw your consent right away.
          </p>
          <div className="p-4 bg-gray-900 rounded-lg inline-block">
            <FooterCookieLink />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Contact Us</h2>
          <p className="text-gray-300 leading-relaxed">
            If you have any questions about our use of cookies, please contact us at privacy@cityrock.pk.
          </p>
        </section>
      </div>
    </main>
  );
}
