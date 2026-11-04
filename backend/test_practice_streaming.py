"""Streaming generation tests without model or network calls."""
import asyncio
import json
import os
import unittest
from unittest.mock import patch

os.environ.setdefault('OPENAI_API_KEY', 'test-key')
from main import GeneratePracticeRequest, stream_practice
from agent.streaming import question_objects


def question(n):
    return {'question': f'Question {n}', 'type': 'multiple_choice',
            'correct_answer': 'A', 'options': ['A', 'B', 'C', 'D']}


async def collect(response):
    return [json.loads(event) async for event in response.body_iterator]


class StreamingTests(unittest.TestCase):
    def test_arbitrary_boundaries_and_escaped_braces(self):
        items = [dict(question(1), question='A "quote", slash \\ and } café'), question(2)]
        payload = '```json\n' + json.dumps(items, ensure_ascii=False) + '\n```'
        self.assertEqual(list(question_objects(iter(payload))), items)

    def test_first_object_is_available_before_stream_finishes(self):
        def chunks():
            yield '[' + json.dumps(question(1)) + ','
            raise RuntimeError('connection lost')
        parsed = question_objects(chunks())
        self.assertEqual(next(parsed), question(1))
        with self.assertRaises(RuntimeError):
            next(parsed)

    @patch('main.GeneratePracticeTool')
    def test_one_model_call_emits_five_questions_and_done(self, tool):
        tool.return_value.execute.return_value = (char for char in json.dumps([question(i) for i in range(5)]))
        events = asyncio.run(collect(stream_practice(GeneratePracticeRequest(topic='Travel'))))
        self.assertEqual([event['type'] for event in events], ['question'] * 5 + ['done'])
        tool.return_value.execute.assert_called_once()
        self.assertTrue(tool.return_value.execute.call_args.kwargs['stream'])

    @patch('main.GeneratePracticeTool')
    def test_interruption_keeps_question_and_reports_error(self, tool):
        def chunks():
            yield '[' + json.dumps(question(1)) + ','
            raise RuntimeError('connection lost')
        tool.return_value.execute.return_value = chunks()
        events = asyncio.run(collect(stream_practice(GeneratePracticeRequest(topic='Travel'))))
        self.assertEqual([event['type'] for event in events], ['question', 'error'])

    @patch('main.GeneratePracticeTool')
    def test_retry_emits_only_missing_distinct_questions(self, tool):
        tool.return_value.execute.return_value = (char for char in json.dumps([question(1), question(2), question(3)]))
        events = asyncio.run(collect(stream_practice(GeneratePracticeRequest(
            topic='Travel', count=2, exclude_questions=['Question 1'],
        ))))
        self.assertEqual([event['exercise']['question'] for event in events if event['type'] == 'question'], ['Question 2', 'Question 3'])
        self.assertEqual(events[-1]['type'], 'done')


if __name__ == '__main__':
    unittest.main()
