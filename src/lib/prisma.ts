import { PrismaClient } from '../generated/prisma';
import { tracer } from '../tracer';

declare global {
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
  })
    .$on('query', (e) => {
      const span = tracer.startSpan(`prisma_raw_query`, {
        childOf: tracer.scope().active() || undefined,
        tags: {
          'prisma.rawquery': e.query,
        },
      });
      span.finish();
    })
    .$extends({
      query: {
        async $allOperations({ operation, model, args, query }) {
          const span = tracer.startSpan(
            `prisma_query_${model?.toLowerCase()}_${operation}`,
            {
              tags: {
                'prisma.operation': operation,
                'prisma.model': model,
                'prisma.args': JSON.stringify(args),
                'prisma.rawQuery': query,
              },
              childOf: tracer.scope().active() || undefined,
            }
          );

          try {
            const result = await query(args);
            span.finish();
            return result;
          } catch (error) {
            span.setTag('error', error);
            span.finish();
            throw error;
          }
        },
      },
    });

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
