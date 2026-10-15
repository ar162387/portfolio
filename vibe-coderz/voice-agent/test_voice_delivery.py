"""Voice delivery settings must match the selected Cardiff audition."""
import asyncio
from unittest.mock import AsyncMock
from google.genai import types
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from bot import ReliableGeminiLiveService, VOICE_DELIVERY_INSTRUCTION, system_prompt


def test_voice_and_cardiff_delivery_lead_the_system_prompt():
    prompt = system_prompt({}, booking_enabled=True)
    assert prompt.startswith(VOICE_DELIVERY_INSTRUCTION + '\n\n')
    assert 'Cardiff Welsh English' in VOICE_DELIVERY_INSTRUCTION
    assert 'friendly, professional receptionist' in VOICE_DELIVERY_INSTRUCTION
    assert 'little playful' not in prompt
    assert 'turn missed leads' not in prompt
    assert 'Appointments last 30 minutes' in prompt
    assert 'Ask for explicit confirmation.' in prompt


def test_native_voice_configuration_removes_us_override_and_preserves_tools(monkeypatch):
    parent = AsyncMock()
    monkeypatch.setattr(GeminiLiveLLMService, '_connection_task_handler', parent)
    service = object.__new__(ReliableGeminiLiveService)
    config = types.LiveConnectConfig(
        generation_config=types.GenerationConfig(
            response_modalities=['AUDIO'], max_output_tokens=4096, temperature=0.7,
            speech_config=types.SpeechConfig(language_code='en-US',voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name='Sulafat')))),
        system_instruction='Cardiff delivery and booking rules',
        tools=[types.Tool(function_declarations=[types.FunctionDeclaration(name='check_appointment_availability',description='Check real slots')])],
        realtime_input_config=types.RealtimeInputConfig(automatic_activity_detection=types.AutomaticActivityDetection(disabled=True)))
    asyncio.run(service._connection_task_handler(config))
    sent = parent.call_args.kwargs['config']
    assert sent.speech_config.voice_config.prebuilt_voice_config.voice_name == 'Sulafat'
    assert sent.speech_config.language_code is None
    assert sent.max_output_tokens == 4096
    assert sent.temperature == 0.7
    assert sent.generation_config is None
    assert sent.response_modalities == [types.Modality.AUDIO]
    assert sent.tools[0].function_declarations[0].name == 'check_appointment_availability'
    assert sent.realtime_input_config.automatic_activity_detection.disabled is True
    assert sent.system_instruction == 'Cardiff delivery and booking rules'
