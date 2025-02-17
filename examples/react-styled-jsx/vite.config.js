import react from '@vitejs/plugin-react'
import ssr from 'vite-plugin-ssr/plugin'

export default {
  plugins: [react({ babel: { plugins: ["styled-jsx/babel"] } }), ssr()]
}
