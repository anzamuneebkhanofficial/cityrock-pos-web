import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-indigo-500 hover:underline mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="bg-amber-900/20 border border-amber-500/30 text-amber-200 p-4 rounded-lg">
          <strong>Draft Notice:</strong> This is a starting draft that must be reviewed by a lawyer before launch. Do not present it as legal advice.
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Introduction</h2>
          <p className="text-gray-300 leading-relaxed">
            At CityRock POS, we take your privacy seriously. This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from our service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Information We Collect</h2>
          <p className="text-gray-300 leading-relaxed">
            We collect information you provide directly to us when you create an account, update your profile, use the interactive features of our Services, participate in contests, promotions or surveys, request customer support, or otherwise communicate with us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How We Use Information</h2>
          <p className="text-gray-300 leading-relaxed">
            We use the information we collect to provide, maintain, and improve our services, as well as to develop new services and protect CityRock POS and our users.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Contact Us</h2>
          <p className="text-gray-300 leading-relaxed">
            For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by e-mail at privacy@cityrock.pk.
          </p>
        </section>
      </div>
    </main>
  );
}
