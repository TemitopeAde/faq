import { toolsProvider } from '@wix/app-tools/service-plugins';
import { createFAQToolRunner } from '../../../../lib/faq-tools-runtime';
import { faqToolStore } from '../../../../lib/faq-tools-data';

const runFAQTool = createFAQToolRunner(faqToolStore);

toolsProvider.provideHandlers({
  runTool: async ({ request, metadata }) => {
    try {
      return { response: await runFAQTool(request.methodName, request.payload) };
    } catch (error) {
      console.error('FAQ Aria tool failed', { methodName: request.methodName, requestId: metadata.requestId, error });
      throw error;
    }
  },
});
