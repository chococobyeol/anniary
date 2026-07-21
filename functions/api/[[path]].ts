import { handleApiRequest, type Env } from '../../worker/index'

export const onRequest: PagesFunction<Env> = ({ request, env }) => (
  handleApiRequest(request, env)
)
