#!/usr/bin/env python3
"""
Test pentru chatul legislativ - testează integrarea sistemului de legi cu RAG
"""

import asyncio
import httpx
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List

# Configurație test
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

class LegislativeChatTester:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.conversation_history = []
        
    async def test_health_checks(self):
        """Test serviciile de bază"""
        print("\n🔍 Testez serviciile de bază...")
        
        async with httpx.AsyncClient() as client:
            # Test chat health
            try:
                response = await client.get(f"{API_BASE}/chat/health")
                print(f"✅ Chat Health: {response.json()}")
            except Exception as e:
                print(f"❌ Chat Health: {e}")
            
            # Test municipalities
            try:
                response = await client.get(f"{API_BASE}/chat/municipalities")
                municipalities = response.json()
                print(f"✅ Municipalities: {len(municipalities)} găsite")
                return municipalities[0] if municipalities else None
            except Exception as e:
                print(f"❌ Municipalities: {e}")
                return None

    async def test_law_system(self):
        """Test sistemul de legi"""
        print("\n📚 Testez sistemul de legi...")
        
        async with httpx.AsyncClient() as client:
            # Test laws listing
            try:
                response = await client.get(f"{API_BASE}/laws")
                laws = response.json()
                print(f"✅ Laws: {len(laws)} legi găsite")
                
                if laws:
                    law = laws[0]
                    print(f"   Lege test: {law['title']}")
                    
                    # Test versions
                    response = await client.get(f"{API_BASE}/laws/{law['id']}/versions")
                    versions = response.json()
                    print(f"   Versiuni: {len(versions)} găsite")
                    
                    if len(versions) >= 2:
                        # Test comparison
                        v1, v2 = versions[0]['version_no'], versions[1]['version_no']
                        response = await client.get(
                            f"{API_BASE}/laws/{law['id']}/compare",
                            params={"from": v1, "to": v2}
                        )
                        comparison = response.json()
                        print(f"   Comparație V{v1}→V{v2}: {comparison['summary']['changed_pct']}% schimbare")
                        
                        # Test search
                        response = await client.post(
                            f"{API_BASE}/laws/{law['id']}/search",
                            json={"search_term": "taxa", "modification_type": "all"},
                            params={"from": v1, "to": v2}
                        )
                        results = response.json()
                        print(f"   Căutare 'taxa': {len(results)} rezultate")
                    
                    return law
                    
            except Exception as e:
                print(f"❌ Law system: {e}")
                return None

    async def test_legislative_questions(self, municipality: Dict[str, Any], law: Dict[str, Any] = None):
        """Test întrebări legislative specifice"""
        print(f"\n💬 Testez chatul legislativ cu {municipality['name']}...")
        
        # Întrebări de test pentru legislație
        test_questions = [
            "Ce taxe trebuie să plătesc pentru gestionarea deșeurilor?",
            "Când se face colectarea gunoiului în municipalitate?",
            "Ce amendă primesc dacă nu separ deșeurile?",
            "Care sunt obligațiile mele privind gestionarea deșeurilor municipale?",
            "Ce categorii de deșeuri există și cum le separ?",
            "Cât de des se face colectarea deșeurilor reciclabile?",
            "Ce se întâmplă dacă nu plătesc taxa pentru gunoi?"
        ]
        
        # Dacă avem o lege în sistem, adaugăm întrebări specifice
        if law:
            test_questions.extend([
                f"Explică-mi legea '{law['title']}'",
                "Care sunt ultimele modificări legislative?",
                "Ce s-a schimbat în noua versiune a legii?"
            ])
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            for i, question in enumerate(test_questions[:5], 1):  # Testez doar primele 5
                print(f"\n📝 Întrebare {i}: {question}")
                
                try:
                    chat_request = {
                        "message": question,
                        "municipality_id": municipality["id"],
                        "session_id": self.session_id,
                        "conversation_history": self.conversation_history
                    }
                    
                    response = await client.post(
                        f"{API_BASE}/chat",
                        json=chat_request,
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if response.status_code == 200:
                        chat_response = response.json()
                        print(f"🤖 Răspuns ({chat_response['confidence']:.2f} confidence):")
                        print(f"   {chat_response['response'][:200]}...")
                        
                        if chat_response['sources']:
                            print(f"📄 Surse: {len(chat_response['sources'])} documente")
                        
                        # Update conversation history
                        self.conversation_history.extend([
                            {"role": "user", "content": question},
                            {"role": "assistant", "content": chat_response['response']}
                        ])
                        
                    else:
                        print(f"❌ Error {response.status_code}: {response.text}")
                        
                except Exception as e:
                    print(f"❌ Error: {e}")
                
                # Pauză între întrebări
                await asyncio.sleep(1)

    async def test_contextual_conversation(self, municipality: Dict[str, Any]):
        """Test conversație contextuală"""
        print(f"\n🔗 Testez conversația contextuală...")
        
        conversation_flow = [
            "Care sunt taxele pentru deșeuri?",
            "Când trebuie să le plătesc?",
            "Ce se întâmplă dacă întârzii cu plata?",
            "Există reduceri pentru familiile cu copii?",
            "Unde pot afla mai multe informații?"
        ]
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            for i, question in enumerate(conversation_flow, 1):
                print(f"\n💭 Context {i}: {question}")
                
                try:
                    chat_request = {
                        "message": question,
                        "municipality_id": municipality["id"],
                        "session_id": self.session_id,
                        "conversation_history": self.conversation_history[-6:]  # Ultimele 3 schimburi
                    }
                    
                    response = await client.post(
                        f"{API_BASE}/chat",
                        json=chat_request
                    )
                    
                    if response.status_code == 200:
                        chat_response = response.json()
                        print(f"🤖 {chat_response['response'][:150]}...")
                        
                        # Update history
                        self.conversation_history.extend([
                            {"role": "user", "content": question},
                            {"role": "assistant", "content": chat_response['response']}
                        ])
                        
                except Exception as e:
                    print(f"❌ Context error: {e}")
                
                await asyncio.sleep(1)

    async def test_cache_performance(self, municipality: Dict[str, Any]):
        """Test performanța cache-ului"""
        print(f"\n⚡ Testez cache-ul...")
        
        async with httpx.AsyncClient() as client:
            # Get cache stats
            try:
                response = await client.get(
                    f"{API_BASE}/chat/cache/stats",
                    params={"municipality_id": municipality["id"]}
                )
                stats = response.json()
                print(f"📊 Cache stats: {json.dumps(stats, indent=2, default=str)}")
            except Exception as e:
                print(f"❌ Cache stats: {e}")
            
            # Test repeated question (should be cached)
            question = "Ce taxe plătesc pentru gunoi?"
            print(f"\n🔄 Testez cache cu întrebarea: {question}")
            
            # Prima dată (fresh)
            start_time = asyncio.get_event_loop().time()
            try:
                response = await client.post(
                    f"{API_BASE}/chat",
                    json={
                        "message": question,
                        "municipality_id": municipality["id"],
                        "session_id": str(uuid.uuid4())  # New session
                    }
                )
                first_time = asyncio.get_event_loop().time() - start_time
                print(f"⏱️  Prima încercare: {first_time:.2f}s")
            except Exception as e:
                print(f"❌ First attempt: {e}")
            
            # A doua oară (cached)
            start_time = asyncio.get_event_loop().time()
            try:
                response = await client.post(
                    f"{API_BASE}/chat",
                    json={
                        "message": question,
                        "municipality_id": municipality["id"],
                        "session_id": str(uuid.uuid4())  # New session
                    }
                )
                second_time = asyncio.get_event_loop().time() - start_time
                print(f"⏱️  A doua încercare: {second_time:.2f}s")
                
                if second_time < first_time:
                    print("✅ Cache funcționează! A doua încercare e mai rapidă.")
                else:
                    print("⚠️  Cache nu pare să funcționeze.")
                    
            except Exception as e:
                print(f"❌ Second attempt: {e}")

    async def generate_test_report(self):
        """Generează raport de testare"""
        print("\n📋 RAPORT TESTARE CHAT LEGISLATIV")
        print("=" * 50)
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "session_id": self.session_id,
            "total_messages": len(self.conversation_history) // 2,
            "services_tested": [
                "Chat Health Check",
                "Municipalities API", 
                "Laws System",
                "Legislative Questions",
                "Contextual Conversation",
                "Cache Performance"
            ],
            "recommendations": [
                "Verifică că Ollama rulează (needed pentru răspunsuri)",
                "Verifică că Redis rulează (needed pentru cache)",
                "Asigură-te că ai municipality activ în DB",
                "Asigură-te că ai documente încărcate pentru RAG",
                "Testează cu întrebări în română și engleză"
            ]
        }
        
        print(f"📊 Total mesaje testate: {report['total_messages']}")
        print(f"🕐 Session ID: {report['session_id']}")
        print("\n📝 Servicii testate:")
        for service in report['services_tested']:
            print(f"   ✓ {service}")
            
        print("\n💡 Recomandări:")
        for rec in report['recommendations']:
            print(f"   • {rec}")
        
        # Salvează raportul
        with open(f"legislative_chat_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n💾 Raport salvat: legislative_chat_test_report_*.json")

async def main():
    """Funcția principală de test"""
    print("🚀 ÎNCEPE TESTAREA CHATULUI LEGISLATIV")
    print("=" * 50)
    
    tester = LegislativeChatTester()
    
    try:
        # 1. Test servicii de bază
        municipality = await tester.test_health_checks()
        if not municipality:
            print("❌ Nu pot continua fără municipality activ!")
            return
        
        # 2. Test sistem legi
        law = await tester.test_law_system()
        
        # 3. Test întrebări legislative
        await tester.test_legislative_questions(municipality, law)
        
        # 4. Test conversație contextuală
        await tester.test_contextual_conversation(municipality)
        
        # 5. Test cache performance
        await tester.test_cache_performance(municipality)
        
        # 6. Generează raport
        await tester.generate_test_report()
        
        print("\n🎉 TESTARE COMPLETĂ!")
        
    except KeyboardInterrupt:
        print("\n⚠️  Testare întreruptă de utilizator")
    except Exception as e:
        print(f"\n💥 Eroare în testare: {e}")

if __name__ == "__main__":
    print("💻 Test Chat Legislativ - AvanChat")
    print("Asigură-te că backend-ul rulează pe http://localhost:8000")
    print("\nApasă Ctrl+C pentru a opri testarea.\n")
    
    # Rulează testul
    asyncio.run(main())