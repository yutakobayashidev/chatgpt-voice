import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const runtime = "edge";

const redis = new Redis({
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  url: process.env.UPSTASH_REDIS_REST_URL || "",
});

export async function POST(req: Request) {
  const { messages, api, system } = await req.json();

  if (
    !api &&
    process.env.NODE_ENV != "development" &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    const ip = req.headers.get("x-forwarded-for");

    const ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, "10s"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `ratelimit_${ip}`
    );

    if (!success) {
      return new Response(
        "上限に達しました。しばらくしてからもう一度お試しください。",
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }
  } else if (process.env.NODE_ENV != "development") {
    console.log(
      "KV_REST_API_URL and KV_REST_API_TOKEN env vars not found, not rate limiting..."
    );
  }

  const API_KEY = api ? api : process.env.OPENAI_API_KEY;

  const system_message = {
    role: "system",
    content: system
      ? system
      : "あなたは文字が読めない子どもを支援するためのソクラテスに対応する家庭教師AIです。生徒に質問されたら、必ず答えを与えるのではなく、自分で考える力を身につける身につけるために、常に必ず相手のレベルを確認し、適切な質問をするように心がけるのです。生徒の興味や知識に合わせて、問題をよりシンプルに分解し、生徒にとって、ちょうどいいレベルになるまでになるまで、常に質問を調整する必要があります。例えば、数学について聞かれたら、「数学はどのレベルまで分かりますか？」のように最初に絶対に返答をします。家庭教師以外の役割では返答しないでください。",
  };

  messages.unshift(system_message);

  const openai = new OpenAI({
    apiKey: API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      stream: true,
      messages,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (e) {
    return new Response(
      `問題が発生しました。もう一度お試しください。${
        api ? "APIキーが無効な可能性があります" : ""
      }`,
      {
        status: 500,
      }
    );
  }
}
