import io

from openpyxl import Workbook

from talent_estimation.catalog import load_catalog_file


def test_default_catalog(catalog):
    assert catalog.roles_for_scope("data") == ["DE", "DA", "DS", "AI"]
    assert catalog.roles_for_scope("design") == ["UXR", "UX", "UI"]
    assert catalog.match_role("DE1 (Data Engineer), Business Analyst") == ["DE"]
    assert {c.key for c in catalog.ai_categories} >= {"routine_code", "judgment"}
    assert all(c.min_saving <= c.default_saving <= c.max_saving for c in catalog.ai_categories)


def test_excel_catalog_upload():
    wb = Workbook()
    ws = wb.active
    ws.title = "Scope_Capability"
    ws.append(["Kode", "Capability", "In-scope", "Out", "Kata kunci", "Pendukung"])
    ws.append(["DE", "Data Engineer", "Pipeline", "UI", "etl", "mapping"])
    ps = wb.create_sheet("Pilar_Skill")
    ps.append(["Kode", "Pilar", "Skill"])
    ps.append(["DE", "SQL", "Query · Modeling"])
    buf = io.BytesIO()
    wb.save(buf)
    cat = load_catalog_file("x.xlsx", buf.getvalue())
    assert list(cat.roles) == ["DE"]
    assert cat.roles["DE"].pillars == {"SQL": ["Query", "Modeling"]}


def test_catalog_excel_round_trip(catalog):
    from talent_estimation.catalog import catalog_to_excel

    again = load_catalog_file("katalog.xlsx", catalog_to_excel(catalog))
    for code, role in catalog.roles.items():
        copy = again.roles[code]
        assert copy.summary == role.summary
        assert copy.capability_areas == role.capability_areas
        assert copy.in_scope == role.in_scope
        assert copy.substitutes == role.substitutes
        assert copy.aliases == role.aliases
        assert copy.pillars == role.pillars


def test_capabilities_keep_only_catalog_skills(catalog):
    from talent_estimation.skills.judgement import _capabilities
    from talent_estimation.skills.schemas import CapabilityJudgement, RoleJudgement

    judgement = RoleJudgement(
        role="DE",
        involvement="Utama",
        steps=3,
        classification="Simple",
        classification_reason="",
        allocation_fte=0.4,
        allocation_reason="",
        capabilities=[
            CapabilityJudgement(pillar="x", skill="data validation"),
            CapabilityJudgement(pillar="ETL", skill="Skill karangan"),
            CapabilityJudgement(pillar="y", skill="Data Validation"),
            CapabilityJudgement(pillar="", skill="Orchestration & Scheduling"),
        ],
    )
    needs = _capabilities(judgement, catalog)
    assert [(n.pillar, n.skill) for n in needs] == [
        ("Data Quality & Testing", "Data Validation"),
        ("ETL/ELT & Orchestration", "Orchestration & Scheduling"),
    ]
