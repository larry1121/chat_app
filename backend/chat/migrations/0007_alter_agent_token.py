# Generated by Django 4.2 on 2024-07-23 07:18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0006_alter_agent_token'),
    ]

    operations = [
        migrations.AlterField(
            model_name='agent',
            name='token',
            field=models.CharField(db_index=True, default='a_f6cd6ac4-d6ae-49ac-abf9-6ec2f65f0d43', max_length=255, unique=True),
        ),
    ]
