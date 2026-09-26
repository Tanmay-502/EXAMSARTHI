import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log('Running database smoke test...')
  let hasError = false
  
  const checkTable = async (tableName: string) => {
    const { error } = await supabase.from(tableName).select('*').limit(1)
    if (error) {
      console.error(`❌ ${tableName} table error:`, error.message)
      hasError = true
    } else {
      console.log(`✅ ${tableName} table is accessible.`)
    }
  }

  await checkTable('profiles')
  await checkTable('exams')
  await checkTable('questions')
  await checkTable('exam_sessions')
  await checkTable('answers')
  await checkTable('audit_logs')

  if (hasError) {
    console.error('\nSmoke test failed. Some tables are missing or inaccessible.')
    process.exit(1)
  } else {
    console.log('\nAll tables verified successfully.')
  }
}

run()
