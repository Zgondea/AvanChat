#!/usr/bin/env python3
"""
Script pentru adăugarea unei legi cu 4 versiuni diferite pentru testare
"""
import asyncio
import asyncpg
import uuid
from datetime import datetime, timedelta

async def add_law_with_versions():
    # Connect la PostgreSQL
    conn = await asyncpg.connect("postgresql://postgres:postgres123@localhost:5432/chat_legislativ")
    
    try:
        law_id = str(uuid.uuid4())
        law_title = "Legea Gestionării Deșeurilor Municipale"
        law_number = "123/2024"
        
        print(f"🏛️ Creez legea: {law_title}")
        
        # 1. Creez legea principală
        await conn.execute("""
            INSERT INTO laws (id, title, law_number, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
        """, law_id, law_title, law_number, "Lege privind gestionarea deșeurilor în municipalități")
        
        print("✅ Lege creată cu succes")
        
        # 2. Versiunea 1 (Ianuarie 2024)
        version1_id = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO law_versions (id, law_id, version_no, title, effective_date, status, created_at)
            VALUES ($1, $2, 1, $3, $4, 'active', $5)
        """, version1_id, law_id, f"{law_title} - Versiunea 1.0", 
        datetime(2024, 1, 1), datetime(2024, 1, 1))
        
        # Secțiuni pentru versiunea 1
        sections_v1 = [
            ("art1", "Articolul 1", "Prezenta lege stabilește cadrul juridic pentru gestionarea deșeurilor municipale."),
            ("art2", "Articolul 2", "Primăriile au obligația să organizeze colectarea deșeurilor o dată pe săptămână."),
            ("art3", "Articolul 3", "Cetățenii vor plăti o taxă de 50 lei/lună pentru serviciul de colectare."),
            ("art4", "Articolul 4", "Deșeurile periculoase vor fi colectate separat, o dată pe lună."),
        ]
        
        for key, title, content in sections_v1:
            await conn.execute("""
                INSERT INTO law_sections (id, version_id, section_key, title, raw_text, normalized_text, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """, str(uuid.uuid4()), version1_id, key, title, content, content)
        
        print("✅ Versiunea 1 adăugată")
        
        # 3. Versiunea 2 (Martie 2024) - Modificări la frecvența colectării
        version2_id = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO law_versions (id, law_id, version_no, title, effective_date, status, created_at)
            VALUES ($1, $2, 2, $3, $4, 'active', $5)
        """, version2_id, law_id, f"{law_title} - Versiunea 2.0", 
        datetime(2024, 3, 1), datetime(2024, 3, 1))
        
        sections_v2 = [
            ("art1", "Articolul 1", "Prezenta lege stabilește cadrul juridic pentru gestionarea deșeurilor municipale."),
            ("art2", "Articolul 2", "Primăriile au obligația să organizeze colectarea deșeurilor de două ori pe săptămână."),  # MODIFICAT
            ("art3", "Articolul 3", "Cetățenii vor plăti o taxă de 50 lei/lună pentru serviciul de colectare."),
            ("art4", "Articolul 4", "Deșeurile periculoase vor fi colectate separat, o dată pe lună."),
            ("art5", "Articolul 5", "Se instituie obligativitatea separării deșeurilor în categorii: reciclabile, organice și reziduale."),  # NOU
        ]
        
        for key, title, content in sections_v2:
            await conn.execute("""
                INSERT INTO law_sections (id, version_id, section_key, title, raw_text, normalized_text, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """, str(uuid.uuid4()), version2_id, key, title, content, content)
        
        print("✅ Versiunea 2 adăugată")
        
        # 4. Versiunea 3 (Iunie 2024) - Modificări la taxe și sancțiuni
        version3_id = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO law_versions (id, law_id, version_no, title, effective_date, status, created_at)
            VALUES ($1, $2, 3, $3, $4, 'active', $5)
        """, version3_id, law_id, f"{law_title} - Versiunea 3.0", 
        datetime(2024, 6, 1), datetime(2024, 6, 1))
        
        sections_v3 = [
            ("art1", "Articolul 1", "Prezenta lege stabilește cadrul juridic pentru gestionarea deșeurilor municipale și promovarea economiei circulare."),  # MODIFICAT
            ("art2", "Articolul 2", "Primăriile au obligația să organizeze colectarea deșeurilor de două ori pe săptămână."),
            ("art3", "Articolul 3", "Cetățenii vor plăti o taxă de 60 lei/lună pentru serviciul de colectare și procesare."),  # MODIFICAT
            ("art4", "Articolul 4", "Deșeurile periculoase vor fi colectate separat, de două ori pe lună."),  # MODIFICAT
            ("art5", "Articolul 5", "Se instituie obligativitatea separării deșeurilor în categorii: reciclabile, organice și reziduale."),
            ("art6", "Articolul 6", "Nerespectarea obligațiilor de separare se sancționează cu amendă de 100-500 lei."),  # NOU
        ]
        
        for key, title, content in sections_v3:
            await conn.execute("""
                INSERT INTO law_sections (id, version_id, section_key, title, raw_text, normalized_text, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """, str(uuid.uuid4()), version3_id, key, title, content, content)
        
        print("✅ Versiunea 3 adăugată")
        
        # 5. Versiunea 4 (Septembrie 2024) - Versiunea curentă cu modificări majore
        version4_id = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO law_versions (id, law_id, version_no, title, effective_date, status, created_at)
            VALUES ($1, $2, 4, $3, $4, 'active', $5)
        """, version4_id, law_id, f"{law_title} - Versiunea 4.0", 
        datetime(2024, 9, 1), datetime(2024, 9, 1))
        
        sections_v4 = [
            ("art1", "Articolul 1", "Prezenta lege stabilește cadrul juridic pentru gestionarea deșeurilor municipale, promovarea economiei circulare și reducerea impactului asupra mediului."),  # MODIFICAT
            ("art2", "Articolul 2", "Primăriile au obligația să organizeze colectarea deșeurilor zilnic în zonele centrale și de două ori pe săptămână în zonele rezidențiale."),  # MODIFICAT
            ("art3", "Articolul 3", "Cetățenii vor plăti o taxă diferențiată: 70 lei/lună pentru gospodăriile care nu separă deșeurile și 45 lei/lună pentru cele care respectă separarea."),  # MODIFICAT MAJOR
            ("art4", "Articolul 4", "Deșeurile periculoase vor fi colectate separat, săptămânal, prin centre specializate."),  # MODIFICAT
            ("art5", "Articolul 5", "Se instituie obligativitatea separării deșeurilor în 5 categorii: plastic/metal, hârtie/carton, sticlă, organice și reziduale."),  # MODIFICAT
            ("art6", "Articolul 6", "Nerespectarea obligațiilor de separare se sancționează cu amendă de 200-1000 lei pentru persoane fizice și 1000-5000 lei pentru persoane juridice."),  # MODIFICAT
            ("art7", "Articolul 7", "Se înființează Agenția Municipală de Monitorizare a Deșeurilor cu atribuții de control și aplicare a sancțiunilor."),  # NOU
        ]
        
        for key, title, content in sections_v4:
            await conn.execute("""
                INSERT INTO law_sections (id, version_id, section_key, title, raw_text, normalized_text, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """, str(uuid.uuid4()), version4_id, key, title, content, content)
        
        print("✅ Versiunea 4 adăugată")
        
        print(f"""
🎉 SUCCES! Legea a fost creată cu 4 versiuni:
📖 Titlu: {law_title}
📄 Număr: {law_number}
🆔 ID: {law_id}

📊 Versiuni create:
• V1 (Ian 2024): 4 articole - versiunea inițială
• V2 (Mar 2024): 5 articole - modificări la frecvența colectării
• V3 (Iun 2024): 6 articole - modificări la taxe și sancțiuni
• V4 (Sep 2024): 7 articole - versiunea curentă cu modificări majore

🔍 Poți testa comparările între versiuni în aplicația frontend!
        """)
        
    except Exception as e:
        print(f"❌ Eroare: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(add_law_with_versions())