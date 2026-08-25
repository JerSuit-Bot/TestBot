/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    // Load server-side native/Node-only packages as external so webpack does
    // not try to bundle them. This is required for the discord.js bot runtime
    // (@discordjs/ws uses optional native deps and Node-ESM constructs) and for
    // the embedded PGlite database (which relies on import.meta.url-based WASM
    // asset resolution that bundling breaks).
    serverComponentsExternalPackages: [
      '@electric-sql/pglite',
      'discord.js',
      'discord-api-types',
      'discord-api-types/v10',
      '@discordjs/rest',
      '@discordjs/ws',
      '@discordjs/voice',
      '@discordjs/builders',
      '@discordjs/collection',
      '@discordjs/formatters',
      '@discordjs/util',
      '@sapphire/shapeshift',
      '@sapphire/snowflake',
      'undici',
    ],
  },
};

module.exports = nextConfig;
